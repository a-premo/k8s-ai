package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"k8s-ai-ide-backend/internal/models"
	"k8s-ai-ide-backend/pkg/ai"
	"k8s-ai-ide-backend/pkg/cache"
	"k8s-ai-ide-backend/pkg/k8s"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type Handler struct {
	k8sClient     k8s.Client
	mockClient    k8s.Client
	cacheService  cache.Service
	aiService     ai.Service
	logger        *zap.Logger
	upgrader      websocket.Upgrader
	kubeconfigMgr *k8s.KubeconfigManager
}

func New(k8sClient k8s.Client, aiService ai.Service, cacheService cache.Service, logger *zap.Logger) *Handler {
	kubeconfigMgr, err := k8s.NewKubeconfigManager()
	if err != nil {
		logger.Warn("Failed to initialize kubeconfig manager", zap.Error(err))
	}

	return &Handler{
		k8sClient:     k8sClient,
		mockClient:    k8s.NewMockClient(),
		cacheService:  cacheService,
		logger:        logger,
		kubeconfigMgr: kubeconfigMgr,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins in development
			},
		},
	}
}

// refreshK8sClient creates a new K8s client for the current context
func (h *Handler) refreshK8sClient() error {
	newClient, err := k8s.NewClient()
	if err != nil {
		h.logger.Error("Failed to create new K8s client", zap.Error(err))
		return err
	}

	h.k8sClient = newClient
	h.logger.Info("Successfully refreshed K8s client for new context")
	return nil
}

// Helper function to get the appropriate client based on cluster parameter
func (h *Handler) getClient(c *gin.Context) k8s.Client {
	cluster := c.Query("cluster")
	if cluster != "" && strings.HasPrefix(cluster, "demo-") {
		h.logger.Debug("Using mock client for demo cluster", zap.String("cluster", cluster))
		return h.mockClient
	}
	h.logger.Debug("Using real K8s client", zap.String("cluster", cluster))
	return h.k8sClient
}

// Health check
func (h *Handler) Health(c *gin.Context) {
	client := h.getClient(c)
	if err := client.Health(); err != nil {
		h.logger.Error("Health check failed", zap.Error(err))
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unhealthy", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "healthy"})
}

// ============================================================================
// WORKLOADS
// ============================================================================

// Get pods
func (h *Handler) GetPods(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")
	cacheKey := "pods:" + namespace

	if cached, found := h.cacheService.Get(cacheKey); found {
		c.JSON(http.StatusOK, cached)
		return
	}

	pods, err := h.getClient(c).GetPods(namespace)
	if err != nil {
		h.logger.Error("Failed to get pods", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get pods"})
		return
	}

	result := make([]models.Pod, 0, len(pods.Items))
	for _, pod := range pods.Items {
		result = append(result, models.PodFromK8s(&pod))
	}

	h.cacheService.Set(cacheKey, result)
	c.JSON(http.StatusOK, result)
}

// Get deployments
func (h *Handler) GetDeployments(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")
	cacheKey := "deployments:" + namespace

	if cached, found := h.cacheService.Get(cacheKey); found {
		c.JSON(http.StatusOK, cached)
		return
	}

	deployments, err := h.getClient(c).GetDeployments(namespace)
	if err != nil {
		h.logger.Error("Failed to get deployments", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get deployments"})
		return
	}

	result := make([]models.Deployment, 0, len(deployments.Items))
	for _, deployment := range deployments.Items {
		result = append(result, models.DeploymentFromK8s(&deployment))
	}

	h.cacheService.Set(cacheKey, result)
	c.JSON(http.StatusOK, result)
}

// Get daemon sets
func (h *Handler) GetDaemonSets(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	daemonSets, err := h.getClient(c).GetDaemonSets(namespace)
	if err != nil {
		h.logger.Error("Failed to get daemon sets", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get daemon sets"})
		return
	}

	result := make([]models.DaemonSet, 0, len(daemonSets.Items))
	for _, ds := range daemonSets.Items {
		result = append(result, models.DaemonSet{
			Name:      ds.Name,
			Namespace: ds.Namespace,
			Desired:   ds.Status.DesiredNumberScheduled,
			Current:   ds.Status.CurrentNumberScheduled,
			Ready:     ds.Status.NumberReady,
			UpToDate:  ds.Status.UpdatedNumberScheduled,
			Available: ds.Status.NumberAvailable,
			Age:       models.FormatAge(ds.CreationTimestamp.Time),
			Labels:    ds.Labels,
			Raw:       ds,
		})
	}

	c.JSON(http.StatusOK, result)
}

// Get stateful sets
func (h *Handler) GetStatefulSets(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	statefulSets, err := h.getClient(c).GetStatefulSets(namespace)
	if err != nil {
		h.logger.Error("Failed to get stateful sets", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stateful sets"})
		return
	}

	result := make([]models.StatefulSet, 0, len(statefulSets.Items))
	for _, ss := range statefulSets.Items {
		result = append(result, models.StatefulSet{
			Name:      ss.Name,
			Namespace: ss.Namespace,
			Ready:     fmt.Sprintf("%d/%d", ss.Status.ReadyReplicas, *ss.Spec.Replicas),
			Age:       models.FormatAge(ss.CreationTimestamp.Time),
			Labels:    ss.Labels,
			Raw:       ss,
		})
	}

	c.JSON(http.StatusOK, result)
}

// Get replica sets
func (h *Handler) GetReplicaSets(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	replicaSets, err := h.getClient(c).GetReplicaSets(namespace)
	if err != nil {
		h.logger.Error("Failed to get replica sets", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get replica sets"})
		return
	}

	result := make([]models.ReplicaSet, 0, len(replicaSets.Items))
	for _, rs := range replicaSets.Items {
		result = append(result, models.ReplicaSet{
			Name:      rs.Name,
			Namespace: rs.Namespace,
			Desired:   *rs.Spec.Replicas,
			Current:   rs.Status.Replicas,
			Ready:     rs.Status.ReadyReplicas,
			Age:       models.FormatAge(rs.CreationTimestamp.Time),
			Labels:    rs.Labels,
			Raw:       rs,
		})
	}

	c.JSON(http.StatusOK, result)
}

// Get jobs
func (h *Handler) GetJobs(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	jobs, err := h.getClient(c).GetJobs(namespace)
	if err != nil {
		h.logger.Error("Failed to get jobs", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get jobs"})
		return
	}

	result := make([]models.Job, 0, len(jobs.Items))
	for _, job := range jobs.Items {
		result = append(result, models.JobFromK8s(&job))
	}

	c.JSON(http.StatusOK, result)
}

// Get cron jobs
func (h *Handler) GetCronJobs(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	cronJobs, err := h.getClient(c).GetCronJobs(namespace)
	if err != nil {
		h.logger.Error("Failed to get cron jobs", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cron jobs"})
		return
	}

	result := make([]models.CronJob, 0, len(cronJobs.Items))
	for _, cj := range cronJobs.Items {
		lastSchedule := ""
		if cj.Status.LastScheduleTime != nil {
			lastSchedule = models.FormatAge(cj.Status.LastScheduleTime.Time)
		}

		result = append(result, models.CronJob{
			Name:         cj.Name,
			Namespace:    cj.Namespace,
			Schedule:     cj.Spec.Schedule,
			Suspend:      cj.Spec.Suspend != nil && *cj.Spec.Suspend,
			Active:       len(cj.Status.Active),
			LastSchedule: lastSchedule,
			Age:          models.FormatAge(cj.CreationTimestamp.Time),
			Labels:       cj.Labels,
			Raw:          cj,
		})
	}

	c.JSON(http.StatusOK, result)
}

// ============================================================================
// CONFIG
// ============================================================================

// Get config maps
func (h *Handler) GetConfigMaps(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	configMaps, err := h.getClient(c).GetConfigMaps(namespace)
	if err != nil {
		h.logger.Error("Failed to get config maps", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get config maps"})
		return
	}

	result := make([]models.ConfigMap, 0, len(configMaps.Items))
	for _, cm := range configMaps.Items {
		result = append(result, models.ConfigMapFromK8s(&cm))
	}

	c.JSON(http.StatusOK, result)
}

// Get secrets
func (h *Handler) GetSecrets(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	secrets, err := h.getClient(c).GetSecrets(namespace)
	if err != nil {
		h.logger.Error("Failed to get secrets", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get secrets"})
		return
	}

	result := make([]models.Secret, 0, len(secrets.Items))
	for _, secret := range secrets.Items {
		result = append(result, models.SecretFromK8s(&secret))
	}

	c.JSON(http.StatusOK, result)
}

// ============================================================================
// NETWORK
// ============================================================================

// Get services
func (h *Handler) GetServices(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")
	cacheKey := "services:" + namespace

	if cached, found := h.cacheService.Get(cacheKey); found {
		c.JSON(http.StatusOK, cached)
		return
	}

	services, err := h.getClient(c).GetServices(namespace)
	if err != nil {
		h.logger.Error("Failed to get services", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get services"})
		return
	}

	result := make([]models.Service, 0, len(services.Items))
	for _, service := range services.Items {
		result = append(result, models.ServiceFromK8s(&service))
	}

	h.cacheService.Set(cacheKey, result)
	c.JSON(http.StatusOK, result)
}

// Get endpoints
func (h *Handler) GetEndpoints(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	endpoints, err := h.getClient(c).GetEndpoints(namespace)
	if err != nil {
		h.logger.Error("Failed to get endpoints", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get endpoints"})
		return
	}

	result := make([]models.Endpoint, 0, len(endpoints.Items))
	for _, ep := range endpoints.Items {
		endpointList := []string{}
		for _, subset := range ep.Subsets {
			for _, addr := range subset.Addresses {
				for _, port := range subset.Ports {
					endpointList = append(endpointList, fmt.Sprintf("%s:%d", addr.IP, port.Port))
				}
			}
		}

		result = append(result, models.Endpoint{
			Name:      ep.Name,
			Namespace: ep.Namespace,
			Endpoints: endpointList,
			Age:       models.FormatAge(ep.CreationTimestamp.Time),
			Labels:    ep.Labels,
			Raw:       ep,
		})
	}

	c.JSON(http.StatusOK, result)
}

// Get ingresses
func (h *Handler) GetIngresses(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	ingresses, err := h.getClient(c).GetIngresses(namespace)
	if err != nil {
		h.logger.Error("Failed to get ingresses", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get ingresses"})
		return
	}

	result := make([]models.Ingress, 0, len(ingresses.Items))
	for _, ingress := range ingresses.Items {
		result = append(result, models.IngressFromK8s(&ingress))
	}

	c.JSON(http.StatusOK, result)
}

// Get network policies
func (h *Handler) GetNetworkPolicies(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	networkPolicies, err := h.getClient(c).GetNetworkPolicies(namespace)
	if err != nil {
		h.logger.Error("Failed to get network policies", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get network policies"})
		return
	}

	result := make([]models.NetworkPolicy, 0, len(networkPolicies.Items))
	for _, np := range networkPolicies.Items {
		result = append(result, models.NetworkPolicy{
			Name:      np.Name,
			Namespace: np.Namespace,
			Age:       models.FormatAge(np.CreationTimestamp.Time),
			Labels:    np.Labels,
			Raw:       np,
		})
	}

	c.JSON(http.StatusOK, result)
}

// ============================================================================
// STORAGE
// ============================================================================

// Get persistent volumes
func (h *Handler) GetPersistentVolumes(c *gin.Context) {
	pvs, err := h.getClient(c).GetPersistentVolumes()
	if err != nil {
		h.logger.Error("Failed to get persistent volumes", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get persistent volumes"})
		return
	}

	result := make([]models.PersistentVolume, 0, len(pvs.Items))
	for _, pv := range pvs.Items {
		capacity := ""
		if storage, ok := pv.Spec.Capacity["storage"]; ok {
			capacity = storage.String()
		}

		accessModes := make([]string, 0, len(pv.Spec.AccessModes))
		for _, mode := range pv.Spec.AccessModes {
			accessModes = append(accessModes, string(mode))
		}

		claim := ""
		if pv.Spec.ClaimRef != nil {
			claim = fmt.Sprintf("%s/%s", pv.Spec.ClaimRef.Namespace, pv.Spec.ClaimRef.Name)
		}

		storageClass := ""
		if pv.Spec.StorageClassName != "" {
			storageClass = pv.Spec.StorageClassName
		}

		result = append(result, models.PersistentVolume{
			Name:          pv.Name,
			Capacity:      capacity,
			AccessModes:   accessModes,
			ReclaimPolicy: string(pv.Spec.PersistentVolumeReclaimPolicy),
			Status:        string(pv.Status.Phase),
			Claim:         claim,
			StorageClass:  storageClass,
			Reason:        pv.Status.Reason,
			Age:           models.FormatAge(pv.CreationTimestamp.Time),
			Labels:        pv.Labels,
			Raw:           pv,
		})
	}

	c.JSON(http.StatusOK, result)
}

// Get persistent volume claims
func (h *Handler) GetPersistentVolumeClaims(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	pvcs, err := h.getClient(c).GetPersistentVolumeClaims(namespace)
	if err != nil {
		h.logger.Error("Failed to get persistent volume claims", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get persistent volume claims"})
		return
	}

	result := make([]models.PersistentVolumeClaim, 0, len(pvcs.Items))
	for _, pvc := range pvcs.Items {
		capacity := ""
		if storage, ok := pvc.Status.Capacity["storage"]; ok {
			capacity = storage.String()
		}

		accessModes := make([]string, 0, len(pvc.Status.AccessModes))
		for _, mode := range pvc.Status.AccessModes {
			accessModes = append(accessModes, string(mode))
		}

		storageClass := ""
		if pvc.Spec.StorageClassName != nil {
			storageClass = *pvc.Spec.StorageClassName
		}

		result = append(result, models.PersistentVolumeClaim{
			Name:         pvc.Name,
			Namespace:    pvc.Namespace,
			Status:       string(pvc.Status.Phase),
			Volume:       pvc.Spec.VolumeName,
			Capacity:     capacity,
			AccessModes:  accessModes,
			StorageClass: storageClass,
			Age:          models.FormatAge(pvc.CreationTimestamp.Time),
			Labels:       pvc.Labels,
			Raw:          pvc,
		})
	}

	c.JSON(http.StatusOK, result)
}

// Get storage classes
func (h *Handler) GetStorageClasses(c *gin.Context) {
	storageClasses, err := h.getClient(c).GetStorageClasses()
	if err != nil {
		h.logger.Error("Failed to get storage classes", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get storage classes"})
		return
	}

	result := make([]models.StorageClass, 0, len(storageClasses.Items))
	for _, sc := range storageClasses.Items {
		reclaimPolicy := "Delete"
		if sc.ReclaimPolicy != nil {
			reclaimPolicy = string(*sc.ReclaimPolicy)
		}

		volumeBindingMode := "Immediate"
		if sc.VolumeBindingMode != nil {
			volumeBindingMode = string(*sc.VolumeBindingMode)
		}

		allowVolumeExpansion := false
		if sc.AllowVolumeExpansion != nil {
			allowVolumeExpansion = *sc.AllowVolumeExpansion
		}

		result = append(result, models.StorageClass{
			Name:                 sc.Name,
			Provisioner:          sc.Provisioner,
			ReclaimPolicy:        reclaimPolicy,
			VolumeBindingMode:    volumeBindingMode,
			AllowVolumeExpansion: allowVolumeExpansion,
			Age:                  models.FormatAge(sc.CreationTimestamp.Time),
			Labels:               sc.Labels,
			Raw:                  sc,
		})
	}

	c.JSON(http.StatusOK, result)
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

// Get service accounts
func (h *Handler) GetServiceAccounts(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	serviceAccounts, err := h.getClient(c).GetServiceAccounts(namespace)
	if err != nil {
		h.logger.Error("Failed to get service accounts", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get service accounts"})
		return
	}

	result := make([]models.ServiceAccount, 0, len(serviceAccounts.Items))
	for _, sa := range serviceAccounts.Items {
		result = append(result, models.ServiceAccount{
			Name:      sa.Name,
			Namespace: sa.Namespace,
			Secrets:   len(sa.Secrets),
			Age:       models.FormatAge(sa.CreationTimestamp.Time),
			Labels:    sa.Labels,
			Raw:       sa,
		})
	}

	c.JSON(http.StatusOK, result)
}

// Get roles
func (h *Handler) GetRoles(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	roles, err := h.getClient(c).GetRoles(namespace)
	if err != nil {
		h.logger.Error("Failed to get roles", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get roles"})
		return
	}

	result := make([]models.Role, 0, len(roles.Items))
	for _, role := range roles.Items {
		result = append(result, models.Role{
			Name:      role.Name,
			Namespace: role.Namespace,
			Age:       models.FormatAge(role.CreationTimestamp.Time),
			Labels:    role.Labels,
			Raw:       role,
		})
	}

	c.JSON(http.StatusOK, result)
}

// Get cluster roles
func (h *Handler) GetClusterRoles(c *gin.Context) {
	clusterRoles, err := h.getClient(c).GetClusterRoles()
	if err != nil {
		h.logger.Error("Failed to get cluster roles", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cluster roles"})
		return
	}

	result := make([]models.ClusterRole, 0, len(clusterRoles.Items))
	for _, cr := range clusterRoles.Items {
		result = append(result, models.ClusterRole{
			Name:   cr.Name,
			Age:    models.FormatAge(cr.CreationTimestamp.Time),
			Labels: cr.Labels,
			Raw:    cr,
		})
	}

	c.JSON(http.StatusOK, result)
}

// Get role bindings
func (h *Handler) GetRoleBindings(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "default")

	roleBindings, err := h.getClient(c).GetRoleBindings(namespace)
	if err != nil {
		h.logger.Error("Failed to get role bindings", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get role bindings"})
		return
	}

	result := make([]models.RoleBinding, 0, len(roleBindings.Items))
	for _, rb := range roleBindings.Items {
		result = append(result, models.RoleBinding{
			Name:      rb.Name,
			Namespace: rb.Namespace,
			Role:      rb.RoleRef.Name,
			Age:       models.FormatAge(rb.CreationTimestamp.Time),
			Labels:    rb.Labels,
			Raw:       rb,
		})
	}

	c.JSON(http.StatusOK, result)
}

// Get cluster role bindings
func (h *Handler) GetClusterRoleBindings(c *gin.Context) {
	clusterRoleBindings, err := h.getClient(c).GetClusterRoleBindings()
	if err != nil {
		h.logger.Error("Failed to get cluster role bindings", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cluster role bindings"})
		return
	}

	result := make([]models.ClusterRoleBinding, 0, len(clusterRoleBindings.Items))
	for _, crb := range clusterRoleBindings.Items {
		result = append(result, models.ClusterRoleBinding{
			Name:   crb.Name,
			Role:   crb.RoleRef.Name,
			Age:    models.FormatAge(crb.CreationTimestamp.Time),
			Labels: crb.Labels,
			Raw:    crb,
		})
	}

	c.JSON(http.StatusOK, result)
}

// ============================================================================
// COMMON OPERATIONS
// ============================================================================

// Get nodes
func (h *Handler) GetNodes(c *gin.Context) {
	cacheKey := "nodes"

	if cached, found := h.cacheService.Get(cacheKey); found {
		c.JSON(http.StatusOK, cached)
		return
	}

	nodes, err := h.getClient(c).GetNodes()
	if err != nil {
		h.logger.Error("Failed to get nodes", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get nodes"})
		return
	}

	result := make([]models.Node, 0, len(nodes.Items))
	for _, node := range nodes.Items {
		result = append(result, models.NodeFromK8s(&node))
	}

	h.cacheService.Set(cacheKey, result)
	c.JSON(http.StatusOK, result)
}

// Get namespaces
func (h *Handler) GetNamespaces(c *gin.Context) {
	cacheKey := "namespaces"

	if cached, found := h.cacheService.Get(cacheKey); found {
		c.JSON(http.StatusOK, cached)
		return
	}

	namespaces, err := h.getClient(c).GetNamespaces()
	if err != nil {
		h.logger.Error("Failed to get namespaces", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get namespaces"})
		return
	}

	result := []string{"All Namespaces"}
	for _, ns := range namespaces.Items {
		result = append(result, ns.Name)
	}

	h.cacheService.Set(cacheKey, result)
	c.JSON(http.StatusOK, result)
}

// Get events
func (h *Handler) GetEvents(c *gin.Context) {
	namespace := c.DefaultQuery("namespace", "")

	events, err := h.getClient(c).GetEvents(namespace)
	if err != nil {
		h.logger.Error("Failed to get events", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get events"})
		return
	}

	result := make([]models.Event, 0, len(events.Items))
	for _, event := range events.Items {
		result = append(result, models.EventFromK8s(&event))
	}

	c.JSON(http.StatusOK, result)
}

// ============================================================================
// POD OPERATIONS (LOGS, SHELL, etc.)
// ============================================================================

// Get pod logs
func (h *Handler) GetPodLogs(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	container := c.DefaultQuery("container", "")
	linesStr := c.DefaultQuery("lines", "100")
	follow := c.DefaultQuery("follow", "false") == "true"

	lines, err := strconv.ParseInt(linesStr, 10, 64)
	if err != nil {
		lines = 100
	}

	if follow {
		// Handle streaming logs via WebSocket
		h.handlePodLogsWebSocket(c, namespace, name, container, lines)
		return
	}

	logs, err := h.getClient(c).GetPodLogs(namespace, name, container, lines)
	if err != nil {
		h.logger.Error("Failed to get pod logs", zap.Error(err), zap.String("pod", name))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get pod logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":      strings.Split(logs, "\n"),
		"pod":       name,
		"container": container,
	})
}

// Handle pod shell access via WebSocket
func (h *Handler) PodShell(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	container := c.DefaultQuery("container", "")

	// Upgrade to WebSocket
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade websocket for pod shell", zap.Error(err))
		return
	}
	defer conn.Close()

	h.logger.Info("Pod shell connection established",
		zap.String("pod", name),
		zap.String("namespace", namespace),
		zap.String("container", container))

	// Execute shell in pod via Kubernetes API
	err = h.getClient(c).ExecInPod(namespace, name, container, []string{"/bin/sh"}, conn)
	if err != nil {
		h.logger.Error("Failed to exec in pod", zap.Error(err))
		conn.WriteJSON(gin.H{"error": "Failed to execute shell in pod"})
		return
	}
}

// Handle streaming pod logs via WebSocket
func (h *Handler) handlePodLogsWebSocket(c *gin.Context, namespace, name, container string, lines int64) {
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade websocket for pod logs", zap.Error(err))
		return
	}
	defer conn.Close()

	h.logger.Info("Pod logs streaming connection established",
		zap.String("pod", name),
		zap.String("namespace", namespace))

	// Stream logs from Kubernetes API
	err = h.getClient(c).StreamPodLogs(namespace, name, container, lines, conn)
	if err != nil {
		h.logger.Error("Failed to stream pod logs", zap.Error(err))
		conn.WriteJSON(gin.H{"error": "Failed to stream pod logs"})
		return
	}
}

// ============================================================================
// RESOURCE EDITING WITH AI ASSISTANCE
// ============================================================================

// Get resource for editing
func (h *Handler) GetResource(c *gin.Context) {
	resourceType := c.Param("resourceType")
	namespace := c.Param("namespace")
	name := c.Param("name")

	resource, err := h.getClient(c).GetResource(resourceType, namespace, name)
	if err != nil {
		h.logger.Error("Failed to get resource", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get resource"})
		return
	}

	// Convert to YAML for editing
	yaml, err := models.ResourceToYAML(resource)
	if err != nil {
		h.logger.Error("Failed to convert resource to YAML", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to convert resource to YAML"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"yaml":     yaml,
		"resource": resource,
	})
}

// Update resource
func (h *Handler) UpdateResource(c *gin.Context) {
	var req models.EditResourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	err := h.getClient(c).UpdateResource(req.ResourceType, req.Namespace, req.Name, req.Content)
	if err != nil {
		h.logger.Error("Failed to update resource", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update resource"})
		return
	}

	c.JSON(http.StatusOK, models.EditResourceResponse{
		Success: true,
		Message: "Resource updated successfully",
	})
}

// AI-assisted resource editing
func (h *Handler) AIEditResource(c *gin.Context) {
	var req models.AIEditRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	response, err := h.aiService.EditResourceWithAI(req.ResourceType, req.CurrentYAML, req.Instructions)
	if err != nil {
		h.logger.Error("Failed to edit resource with AI", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to edit resource with AI"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ============================================================================
// AI ANALYSIS
// ============================================================================

// AI Analysis - Pod
func (h *Handler) AnalyzePod(c *gin.Context) {
	var req models.AnalyzePodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	analysis, err := h.aiService.AnalyzePod(req.PodName, req.Namespace, req.PodData)
	if err != nil {
		h.logger.Error("Failed to analyze pod", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze pod"})
		return
	}

	c.JSON(http.StatusOK, analysis)
}

// AI Analysis - Cluster
func (h *Handler) AnalyzeCluster(c *gin.Context) {
	var req models.AnalyzeClusterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	analysis, err := h.aiService.AnalyzeCluster(req.Nodes, req.Pods)
	if err != nil {
		h.logger.Error("Failed to analyze cluster", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze cluster"})
		return
	}

	c.JSON(http.StatusOK, analysis)
}

// AI Chat
func (h *Handler) AIChat(c *gin.Context) {
	var req models.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	response, err := h.aiService.Chat(req.Message, req.Context)
	if err != nil {
		h.logger.Error("Failed to process chat", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process chat"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ============================================================================
// WEBSOCKET HANDLER
// ============================================================================

// WebSocket handler for real-time updates
func (h *Handler) WebSocket(c *gin.Context) {
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade websocket", zap.Error(err))
		return
	}
	defer conn.Close()

	h.logger.Info("WebSocket connection established")

	// Handle real-time updates
	for {
		var msg map[string]interface{}
		if err := conn.ReadJSON(&msg); err != nil {
			h.logger.Error("WebSocket read error", zap.Error(err))
			break
		}

		// Handle different message types
		switch msg["type"] {
		case "subscribe":
			// Handle subscription to resource changes
			h.handleSubscription(conn, msg)
		case "unsubscribe":
			// Handle unsubscription
			h.handleUnsubscription(conn, msg)
		case "ping":
			// Handle ping/pong
			conn.WriteJSON(gin.H{"type": "pong"})
		}
	}
}

// Handle WebSocket subscription
func (h *Handler) handleSubscription(conn *websocket.Conn, msg map[string]interface{}) {
	// Implementation for real-time updates
	// This would use K8s watch API to stream changes
}

// Handle WebSocket unsubscription
func (h *Handler) handleUnsubscription(conn *websocket.Conn, msg map[string]interface{}) {
	// Implementation for stopping real-time updates
}

// ============================================================================
// CLUSTER MANAGEMENT
// ============================================================================

// Get available clusters from kubeconfig
func (h *Handler) GetClusters(c *gin.Context) {
	if h.kubeconfigMgr == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kubeconfig manager not available"})
		return
	}

	clusters, err := h.kubeconfigMgr.GetAvailableClusters()
	if err != nil {
		h.logger.Error("Failed to get available clusters", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get available clusters"})
		return
	}

	// Check health status for each cluster
	for i := range clusters {
		// For now, we'll just check if it's the current context
		if clusters[i].CurrentContext {
			if err := h.getClient(c).Health(); err != nil {
				clusters[i].Status = "disconnected"
			} else {
				clusters[i].Status = "connected"
			}
		} else {
			clusters[i].Status = "available"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"clusters": clusters,
		"current":  h.kubeconfigMgr.GetCurrentContext(),
	})
}

// Switch to a different cluster context
func (h *Handler) SwitchCluster(c *gin.Context) {
	var req struct {
		Context string `json:"context" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if h.kubeconfigMgr == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kubeconfig manager not available"})
		return
	}

	err := h.kubeconfigMgr.SwitchContext(req.Context)
	if err != nil {
		h.logger.Error("Failed to switch cluster context", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to switch cluster context: %v", err)})
		return
	}

	// Refresh the K8s client to connect to the new cluster
	if err := h.refreshK8sClient(); err != nil {
		h.logger.Error("Failed to refresh K8s client after context switch", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to connect to new cluster: %v", err)})
		return
	}

	h.logger.Info("Successfully switched cluster context and refreshed client",
		zap.String("context", req.Context))

	// Clear cache when switching clusters
	h.cacheService.Clear()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Successfully switched to cluster context: %s", req.Context),
		"context": req.Context,
	})
}

// Get current cluster context
func (h *Handler) GetCurrentCluster(c *gin.Context) {
	if h.kubeconfigMgr == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kubeconfig manager not available"})
		return
	}

	currentContext := h.kubeconfigMgr.GetCurrentContext()

	// Check health status
	status := "connected"
	if err := h.getClient(c).Health(); err != nil {
		status = "disconnected"
	}

	c.JSON(http.StatusOK, gin.H{
		"context": currentContext,
		"status":  status,
	})
}
