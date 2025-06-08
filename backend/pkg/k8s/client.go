package k8s

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"github.com/gorilla/websocket"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	storagev1 "k8s.io/api/storage/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/remotecommand"
	"k8s.io/client-go/util/homedir"
)

// Client interface for K8s operations
type Client interface {
	// Health check
	Health() error

	// Workloads
	GetPods(namespace string) (*corev1.PodList, error)
	GetDeployments(namespace string) (*appsv1.DeploymentList, error)
	GetDaemonSets(namespace string) (*appsv1.DaemonSetList, error)
	GetStatefulSets(namespace string) (*appsv1.StatefulSetList, error)
	GetReplicaSets(namespace string) (*appsv1.ReplicaSetList, error)
	GetJobs(namespace string) (*batchv1.JobList, error)
	GetCronJobs(namespace string) (*batchv1.CronJobList, error)

	// Config
	GetConfigMaps(namespace string) (*corev1.ConfigMapList, error)
	GetSecrets(namespace string) (*corev1.SecretList, error)

	// Network
	GetServices(namespace string) (*corev1.ServiceList, error)
	GetEndpoints(namespace string) (*corev1.EndpointsList, error)
	GetIngresses(namespace string) (*networkingv1.IngressList, error)
	GetNetworkPolicies(namespace string) (*networkingv1.NetworkPolicyList, error)

	// Storage
	GetPersistentVolumes() (*corev1.PersistentVolumeList, error)
	GetPersistentVolumeClaims(namespace string) (*corev1.PersistentVolumeClaimList, error)
	GetStorageClasses() (*storagev1.StorageClassList, error)

	// Access Control
	GetServiceAccounts(namespace string) (*corev1.ServiceAccountList, error)
	GetRoles(namespace string) (*rbacv1.RoleList, error)
	GetClusterRoles() (*rbacv1.ClusterRoleList, error)
	GetRoleBindings(namespace string) (*rbacv1.RoleBindingList, error)
	GetClusterRoleBindings() (*rbacv1.ClusterRoleBindingList, error)

	// Common
	GetNodes() (*corev1.NodeList, error)
	GetNamespaces() (*corev1.NamespaceList, error)
	GetEvents(namespace string) (*corev1.EventList, error)

	// Pod Operations
	GetPodLogs(namespace, name, container string, lines int64) (string, error)
	StreamPodLogs(namespace, name, container string, lines int64, ws *websocket.Conn) error
	ExecInPod(namespace, name, container string, command []string, ws *websocket.Conn) error

	// Resource Operations
	GetResource(resourceType, namespace, name string) (interface{}, error)
	UpdateResource(resourceType, namespace, name, content string) error
}

// client implements the Client interface
type client struct {
	clientset *kubernetes.Clientset
	config    *rest.Config
	dynamic   dynamic.Interface
}

// NewClient creates a new K8s client
func NewClient() (Client, error) {
	config, err := getConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes config: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes client: %v", err)
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %v", err)
	}

	return &client{
		clientset: clientset,
		config:    config,
		dynamic:   dynamicClient,
	}, nil
}

// NewClientWithContext creates a new K8s client for a specific context
func NewClientWithContext(contextName string) (Client, error) {
	config, err := getConfigWithContext(contextName)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes config for context %s: %v", contextName, err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes client for context %s: %v", contextName, err)
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client for context %s: %v", contextName, err)
	}

	return &client{
		clientset: clientset,
		config:    config,
		dynamic:   dynamicClient,
	}, nil
}

// getConfig gets the kubernetes config
func getConfig() (*rest.Config, error) {
	// Try in-cluster config first
	config, err := rest.InClusterConfig()
	if err == nil {
		return config, nil
	}

	// Fall back to kubeconfig
	kubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")
	config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, err
	}

	return config, nil
}

// getConfigWithContext gets the kubernetes config for a specific context
func getConfigWithContext(contextName string) (*rest.Config, error) {
	kubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig: %v", err)
	}

	// Create a client config for the specified context
	clientConfig := clientcmd.NewDefaultClientConfig(*config, &clientcmd.ConfigOverrides{
		CurrentContext: contextName,
	})

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to create client config for context %s: %v", contextName, err)
	}

	return restConfig, nil
}

// Health checks the connection to the K8s API
func (c *client) Health() error {
	_, err := c.clientset.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{Limit: 1})
	return err
}

// ============================================================================
// WORKLOADS
// ============================================================================

func (c *client) GetPods(namespace string) (*corev1.PodList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetDeployments(namespace string) (*appsv1.DeploymentList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.AppsV1().Deployments("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.AppsV1().Deployments(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetDaemonSets(namespace string) (*appsv1.DaemonSetList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.AppsV1().DaemonSets("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.AppsV1().DaemonSets(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetStatefulSets(namespace string) (*appsv1.StatefulSetList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.AppsV1().StatefulSets("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.AppsV1().StatefulSets(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetReplicaSets(namespace string) (*appsv1.ReplicaSetList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.AppsV1().ReplicaSets("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.AppsV1().ReplicaSets(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetJobs(namespace string) (*batchv1.JobList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.BatchV1().Jobs("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.BatchV1().Jobs(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetCronJobs(namespace string) (*batchv1.CronJobList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.BatchV1().CronJobs("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.BatchV1().CronJobs(namespace).List(context.TODO(), metav1.ListOptions{})
}

// ============================================================================
// CONFIG
// ============================================================================

func (c *client) GetConfigMaps(namespace string) (*corev1.ConfigMapList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.CoreV1().ConfigMaps("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.CoreV1().ConfigMaps(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetSecrets(namespace string) (*corev1.SecretList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.CoreV1().Secrets("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.CoreV1().Secrets(namespace).List(context.TODO(), metav1.ListOptions{})
}

// ============================================================================
// NETWORK
// ============================================================================

func (c *client) GetServices(namespace string) (*corev1.ServiceList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.CoreV1().Services("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.CoreV1().Services(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetEndpoints(namespace string) (*corev1.EndpointsList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.CoreV1().Endpoints("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.CoreV1().Endpoints(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetIngresses(namespace string) (*networkingv1.IngressList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.NetworkingV1().Ingresses("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.NetworkingV1().Ingresses(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetNetworkPolicies(namespace string) (*networkingv1.NetworkPolicyList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.NetworkingV1().NetworkPolicies("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.NetworkingV1().NetworkPolicies(namespace).List(context.TODO(), metav1.ListOptions{})
}

// ============================================================================
// STORAGE
// ============================================================================

func (c *client) GetPersistentVolumes() (*corev1.PersistentVolumeList, error) {
	return c.clientset.CoreV1().PersistentVolumes().List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetPersistentVolumeClaims(namespace string) (*corev1.PersistentVolumeClaimList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.CoreV1().PersistentVolumeClaims("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.CoreV1().PersistentVolumeClaims(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetStorageClasses() (*storagev1.StorageClassList, error) {
	return c.clientset.StorageV1().StorageClasses().List(context.TODO(), metav1.ListOptions{})
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

func (c *client) GetServiceAccounts(namespace string) (*corev1.ServiceAccountList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.CoreV1().ServiceAccounts("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.CoreV1().ServiceAccounts(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetRoles(namespace string) (*rbacv1.RoleList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.RbacV1().Roles("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.RbacV1().Roles(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetClusterRoles() (*rbacv1.ClusterRoleList, error) {
	return c.clientset.RbacV1().ClusterRoles().List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetRoleBindings(namespace string) (*rbacv1.RoleBindingList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.RbacV1().RoleBindings("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.RbacV1().RoleBindings(namespace).List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetClusterRoleBindings() (*rbacv1.ClusterRoleBindingList, error) {
	return c.clientset.RbacV1().ClusterRoleBindings().List(context.TODO(), metav1.ListOptions{})
}

// ============================================================================
// COMMON
// ============================================================================

func (c *client) GetNodes() (*corev1.NodeList, error) {
	return c.clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetNamespaces() (*corev1.NamespaceList, error) {
	return c.clientset.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
}

func (c *client) GetEvents(namespace string) (*corev1.EventList, error) {
	if namespace == "" || namespace == "all" {
		return c.clientset.CoreV1().Events("").List(context.TODO(), metav1.ListOptions{})
	}
	return c.clientset.CoreV1().Events(namespace).List(context.TODO(), metav1.ListOptions{})
}

// ============================================================================
// POD OPERATIONS
// ============================================================================

func (c *client) GetPodLogs(namespace, name, container string, lines int64) (string, error) {
	opts := &corev1.PodLogOptions{
		Container: container,
		TailLines: &lines,
	}

	req := c.clientset.CoreV1().Pods(namespace).GetLogs(name, opts)
	stream, err := req.Stream(context.TODO())
	if err != nil {
		return "", err
	}
	defer stream.Close()

	logs, err := io.ReadAll(stream)
	if err != nil {
		return "", err
	}

	return string(logs), nil
}

func (c *client) StreamPodLogs(namespace, name, container string, lines int64, ws *websocket.Conn) error {
	opts := &corev1.PodLogOptions{
		Container: container,
		Follow:    true,
		TailLines: &lines,
	}

	req := c.clientset.CoreV1().Pods(namespace).GetLogs(name, opts)
	stream, err := req.Stream(context.TODO())
	if err != nil {
		return err
	}
	defer stream.Close()

	// Stream logs to WebSocket
	scanner := make([]byte, 4096)
	for {
		n, err := stream.Read(scanner)
		if err != nil {
			if err == io.EOF {
				break
			}
			return err
		}

		if err := ws.WriteMessage(websocket.TextMessage, scanner[:n]); err != nil {
			return err
		}
	}

	return nil
}

func (c *client) ExecInPod(namespace, name, container string, command []string, ws *websocket.Conn) error {
	req := c.clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(name).
		Namespace(namespace).
		SubResource("exec")

	req.VersionedParams(&corev1.PodExecOptions{
		Container: container,
		Command:   command,
		Stdin:     true,
		Stdout:    true,
		Stderr:    true,
		TTY:       true,
	}, scheme.ParameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(c.config, "POST", req.URL())
	if err != nil {
		return err
	}

	// Create WebSocket streams
	reader := &wsReader{conn: ws}
	writer := &wsWriter{conn: ws}

	return exec.Stream(remotecommand.StreamOptions{
		Stdin:  reader,
		Stdout: writer,
		Stderr: writer,
		Tty:    true,
	})
}

// ============================================================================
// RESOURCE OPERATIONS
// ============================================================================

func (c *client) GetResource(resourceType, namespace, name string) (interface{}, error) {
	gvr := getGVR(resourceType)

	var result *unstructured.Unstructured
	var err error

	if isNamespaced(resourceType) {
		result, err = c.dynamic.Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	} else {
		result, err = c.dynamic.Resource(gvr).Get(context.TODO(), name, metav1.GetOptions{})
	}

	if err != nil {
		return nil, err
	}

	return result.Object, nil
}

func (c *client) UpdateResource(resourceType, namespace, name, content string) error {
	gvr := getGVR(resourceType)

	// Parse YAML content
	obj := &unstructured.Unstructured{}
	if err := obj.UnmarshalJSON([]byte(content)); err != nil {
		return fmt.Errorf("failed to parse resource content: %v", err)
	}

	// Update the resource
	if isNamespaced(resourceType) {
		_, err := c.dynamic.Resource(gvr).Namespace(namespace).Update(context.TODO(), obj, metav1.UpdateOptions{})
		return err
	} else {
		_, err := c.dynamic.Resource(gvr).Update(context.TODO(), obj, metav1.UpdateOptions{})
		return err
	}
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// getGVR returns the GroupVersionResource for a resource type
func getGVR(resourceType string) schema.GroupVersionResource {
	resourceTypes := map[string]schema.GroupVersionResource{
		"pod":                   {Group: "", Version: "v1", Resource: "pods"},
		"deployment":            {Group: "apps", Version: "v1", Resource: "deployments"},
		"service":               {Group: "", Version: "v1", Resource: "services"},
		"ingress":               {Group: "networking.k8s.io", Version: "v1", Resource: "ingresses"},
		"configmap":             {Group: "", Version: "v1", Resource: "configmaps"},
		"secret":                {Group: "", Version: "v1", Resource: "secrets"},
		"daemonset":             {Group: "apps", Version: "v1", Resource: "daemonsets"},
		"statefulset":           {Group: "apps", Version: "v1", Resource: "statefulsets"},
		"job":                   {Group: "batch", Version: "v1", Resource: "jobs"},
		"cronjob":               {Group: "batch", Version: "v1", Resource: "cronjobs"},
		"persistentvolume":      {Group: "", Version: "v1", Resource: "persistentvolumes"},
		"persistentvolumeclaim": {Group: "", Version: "v1", Resource: "persistentvolumeclaims"},
		"storageclass":          {Group: "storage.k8s.io", Version: "v1", Resource: "storageclasses"},
		"node":                  {Group: "", Version: "v1", Resource: "nodes"},
		"namespace":             {Group: "", Version: "v1", Resource: "namespaces"},
	}

	if gvr, ok := resourceTypes[strings.ToLower(resourceType)]; ok {
		return gvr
	}

	// Default to generic resource
	return schema.GroupVersionResource{Group: "", Version: "v1", Resource: resourceType}
}

// isNamespaced returns true if the resource type is namespaced
func isNamespaced(resourceType string) bool {
	clusterScoped := []string{
		"node", "namespace", "persistentvolume", "storageclass",
		"clusterrole", "clusterrolebinding",
	}

	for _, r := range clusterScoped {
		if strings.ToLower(resourceType) == r {
			return false
		}
	}

	return true
}

// WebSocket reader/writer implementations
type wsReader struct {
	conn *websocket.Conn
}

func (r *wsReader) Read(p []byte) (n int, err error) {
	_, data, err := r.conn.ReadMessage()
	if err != nil {
		return 0, err
	}
	copy(p, data)
	return len(data), nil
}

type wsWriter struct {
	conn *websocket.Conn
}

func (w *wsWriter) Write(p []byte) (n int, err error) {
	err = w.conn.WriteMessage(websocket.TextMessage, p)
	if err != nil {
		return 0, err
	}
	return len(p), nil
}
