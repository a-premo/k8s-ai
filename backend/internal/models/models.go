package models

import (
	"fmt"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/yaml"
)

// ============================================================================
// WORKLOADS
// ============================================================================

// Pod represents a Kubernetes pod
type Pod struct {
	Name       string            `json:"name"`
	Namespace  string            `json:"namespace"`
	Status     string            `json:"status"`
	Ready      string            `json:"ready"`
	Restarts   int32             `json:"restarts"`
	Age        string            `json:"age"`
	Node       string            `json:"node"`
	HasErrors  bool              `json:"hasErrors"`
	Labels     map[string]string `json:"labels"`
	Containers []Container       `json:"containers"`
	Raw        interface{}       `json:"raw,omitempty"`
}

// Container represents a container in a pod
type Container struct {
	Name  string `json:"name"`
	Image string `json:"image"`
	Ready bool   `json:"ready"`
}

// Deployment represents a Kubernetes deployment
type Deployment struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Ready     string            `json:"ready"`
	UpToDate  int32             `json:"upToDate"`
	Available int32             `json:"available"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// DaemonSet represents a Kubernetes daemon set
type DaemonSet struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Desired   int32             `json:"desired"`
	Current   int32             `json:"current"`
	Ready     int32             `json:"ready"`
	UpToDate  int32             `json:"upToDate"`
	Available int32             `json:"available"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// StatefulSet represents a Kubernetes stateful set
type StatefulSet struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Ready     string            `json:"ready"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// ReplicaSet represents a Kubernetes replica set
type ReplicaSet struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Desired   int32             `json:"desired"`
	Current   int32             `json:"current"`
	Ready     int32             `json:"ready"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// Job represents a Kubernetes job
type Job struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace"`
	Completions string            `json:"completions"`
	Duration    string            `json:"duration"`
	Age         string            `json:"age"`
	Labels      map[string]string `json:"labels"`
	Raw         interface{}       `json:"raw,omitempty"`
}

// CronJob represents a Kubernetes cron job
type CronJob struct {
	Name         string            `json:"name"`
	Namespace    string            `json:"namespace"`
	Schedule     string            `json:"schedule"`
	Suspend      bool              `json:"suspend"`
	Active       int               `json:"active"`
	LastSchedule string            `json:"lastSchedule"`
	Age          string            `json:"age"`
	Labels       map[string]string `json:"labels"`
	Raw          interface{}       `json:"raw,omitempty"`
}

// ============================================================================
// CONFIG
// ============================================================================

// ConfigMap represents a Kubernetes config map
type ConfigMap struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Data      int               `json:"data"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// Secret represents a Kubernetes secret
type Secret struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Type      string            `json:"type"`
	Data      int               `json:"data"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// ============================================================================
// NETWORK
// ============================================================================

// Service represents a Kubernetes service
type Service struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Type      string            `json:"type"`
	ClusterIP string            `json:"clusterIP"`
	Ports     []string          `json:"ports"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// Endpoint represents a Kubernetes endpoint
type Endpoint struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Endpoints []string          `json:"endpoints"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// Ingress represents a Kubernetes ingress
type Ingress struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Hosts     []string          `json:"hosts"`
	Address   string            `json:"address"`
	Ports     []string          `json:"ports"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// NetworkPolicy represents a Kubernetes network policy
type NetworkPolicy struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// ============================================================================
// STORAGE
// ============================================================================

// PersistentVolume represents a Kubernetes persistent volume
type PersistentVolume struct {
	Name          string            `json:"name"`
	Capacity      string            `json:"capacity"`
	AccessModes   []string          `json:"accessModes"`
	ReclaimPolicy string            `json:"reclaimPolicy"`
	Status        string            `json:"status"`
	Claim         string            `json:"claim"`
	StorageClass  string            `json:"storageClass"`
	Reason        string            `json:"reason"`
	Age           string            `json:"age"`
	Labels        map[string]string `json:"labels"`
	Raw           interface{}       `json:"raw,omitempty"`
}

// PersistentVolumeClaim represents a Kubernetes persistent volume claim
type PersistentVolumeClaim struct {
	Name         string            `json:"name"`
	Namespace    string            `json:"namespace"`
	Status       string            `json:"status"`
	Volume       string            `json:"volume"`
	Capacity     string            `json:"capacity"`
	AccessModes  []string          `json:"accessModes"`
	StorageClass string            `json:"storageClass"`
	Age          string            `json:"age"`
	Labels       map[string]string `json:"labels"`
	Raw          interface{}       `json:"raw,omitempty"`
}

// StorageClass represents a Kubernetes storage class
type StorageClass struct {
	Name                 string            `json:"name"`
	Provisioner          string            `json:"provisioner"`
	ReclaimPolicy        string            `json:"reclaimPolicy"`
	VolumeBindingMode    string            `json:"volumeBindingMode"`
	AllowVolumeExpansion bool              `json:"allowVolumeExpansion"`
	Age                  string            `json:"age"`
	Labels               map[string]string `json:"labels"`
	Raw                  interface{}       `json:"raw,omitempty"`
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

// ServiceAccount represents a Kubernetes service account
type ServiceAccount struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Secrets   int               `json:"secrets"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// Role represents a Kubernetes role
type Role struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// ClusterRole represents a Kubernetes cluster role
type ClusterRole struct {
	Name   string            `json:"name"`
	Age    string            `json:"age"`
	Labels map[string]string `json:"labels"`
	Raw    interface{}       `json:"raw,omitempty"`
}

// RoleBinding represents a Kubernetes role binding
type RoleBinding struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Role      string            `json:"role"`
	Age       string            `json:"age"`
	Labels    map[string]string `json:"labels"`
	Raw       interface{}       `json:"raw,omitempty"`
}

// ClusterRoleBinding represents a Kubernetes cluster role binding
type ClusterRoleBinding struct {
	Name   string            `json:"name"`
	Role   string            `json:"role"`
	Age    string            `json:"age"`
	Labels map[string]string `json:"labels"`
	Raw    interface{}       `json:"raw,omitempty"`
}

// ============================================================================
// COMMON
// ============================================================================

// Node represents a Kubernetes node
type Node struct {
	Name       string            `json:"name"`
	Status     string            `json:"status"`
	Roles      []string          `json:"roles"`
	Age        string            `json:"age"`
	Version    string            `json:"version"`
	Labels     map[string]string `json:"labels"`
	Conditions []NodeCondition   `json:"conditions"`
	Resources  NodeResources     `json:"resources"`
	Raw        interface{}       `json:"raw,omitempty"`
}

// NodeCondition represents a node condition
type NodeCondition struct {
	Type    string `json:"type"`
	Status  string `json:"status"`
	Reason  string `json:"reason"`
	Message string `json:"message"`
}

// NodeResources represents node resource usage
type NodeResources struct {
	CPUCapacity    string `json:"cpuCapacity"`
	CPUAllocatable string `json:"cpuAllocatable"`
	CPUUsage       string `json:"cpuUsage"`
	MemCapacity    string `json:"memCapacity"`
	MemAllocatable string `json:"memAllocatable"`
	MemUsage       string `json:"memUsage"`
	PodCapacity    string `json:"podCapacity"`
	PodUsage       string `json:"podUsage"`
}

// Event represents a Kubernetes event
type Event struct {
	Namespace       string    `json:"namespace"`
	LastSeen        time.Time `json:"lastSeen"`
	FirstSeen       time.Time `json:"firstSeen"`
	Count           int32     `json:"count"`
	Name            string    `json:"name"`
	Kind            string    `json:"kind"`
	Subobject       string    `json:"subobject"`
	Type            string    `json:"type"`
	Reason          string    `json:"reason"`
	Message         string    `json:"message"`
	SourceHost      string    `json:"sourceHost"`
	SourceComponent string    `json:"sourceComponent"`
}

// ============================================================================
// AI REQUEST/RESPONSE MODELS
// ============================================================================

// AnalyzePodRequest represents a request to analyze a pod
type AnalyzePodRequest struct {
	PodName   string      `json:"podName"`
	Namespace string      `json:"namespace"`
	PodData   interface{} `json:"podData"`
}

// AnalyzeClusterRequest represents a request to analyze the cluster
type AnalyzeClusterRequest struct {
	Nodes []Node `json:"nodes"`
	Pods  []Pod  `json:"pods"`
}

// ChatRequest represents a chat request
type ChatRequest struct {
	Message string                 `json:"message"`
	Context map[string]interface{} `json:"context"`
}

// EditResourceRequest represents a resource edit request
type EditResourceRequest struct {
	ResourceType string `json:"resourceType"`
	Namespace    string `json:"namespace"`
	Name         string `json:"name"`
	Content      string `json:"content"`
}

// EditResourceResponse represents a resource edit response
type EditResourceResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// AIEditRequest represents an AI-assisted edit request
type AIEditRequest struct {
	ResourceType string `json:"resourceType"`
	CurrentYAML  string `json:"currentYaml"`
	Instructions string `json:"instructions"`
}

// AI Analysis models
type AIAnalysis struct {
	Type            string    `json:"type"`
	Summary         string    `json:"summary"`
	RootCause       string    `json:"rootCause,omitempty"`
	Severity        string    `json:"severity,omitempty"`
	Insights        []string  `json:"insights,omitempty"`
	Recommendations []string  `json:"recommendations"`
	Confidence      int       `json:"confidence"`
	Timestamp       time.Time `json:"timestamp"`
}

type ChatResponse struct {
	Answer            string    `json:"answer"`
	Context           string    `json:"context"`
	FollowUpQuestions []string  `json:"followUpQuestions,omitempty"`
	Timestamp         time.Time `json:"timestamp"`
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

// PodFromK8s converts a K8s pod to our model
func PodFromK8s(pod *corev1.Pod) Pod {
	ready := 0
	totalContainers := len(pod.Spec.Containers)
	var restarts int32
	containers := make([]Container, 0)

	for _, c := range pod.Spec.Containers {
		containerReady := false
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.Name == c.Name {
				if cs.Ready {
					ready++
					containerReady = true
				}
				restarts += cs.RestartCount
			}
		}
		containers = append(containers, Container{
			Name:  c.Name,
			Image: c.Image,
			Ready: containerReady,
		})
	}

	status := string(pod.Status.Phase)
	hasErrors := false

	// Check for specific error conditions
	for _, condition := range pod.Status.Conditions {
		if condition.Type == corev1.PodReady && condition.Status != corev1.ConditionTrue {
			hasErrors = true
		}
	}

	// Check container statuses for errors
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.State.Waiting != nil {
			status = cs.State.Waiting.Reason
			if cs.State.Waiting.Reason == "CrashLoopBackOff" ||
				cs.State.Waiting.Reason == "ImagePullBackOff" ||
				cs.State.Waiting.Reason == "ErrImagePull" {
				hasErrors = true
			}
		}
		if cs.State.Terminated != nil && cs.State.Terminated.ExitCode != 0 {
			status = "Error"
			hasErrors = true
		}
	}

	return Pod{
		Name:       pod.Name,
		Namespace:  pod.Namespace,
		Status:     status,
		Ready:      fmt.Sprintf("%d/%d", ready, totalContainers),
		Restarts:   restarts,
		Age:        FormatAge(pod.CreationTimestamp.Time),
		Node:       pod.Spec.NodeName,
		HasErrors:  hasErrors,
		Labels:     pod.Labels,
		Containers: containers,
		Raw:        pod,
	}
}

// DeploymentFromK8s converts a K8s deployment to our model
func DeploymentFromK8s(deployment *appsv1.Deployment) Deployment {
	ready := deployment.Status.ReadyReplicas
	desired := int32(0)
	if deployment.Spec.Replicas != nil {
		desired = *deployment.Spec.Replicas
	}

	return Deployment{
		Name:      deployment.Name,
		Namespace: deployment.Namespace,
		Ready:     fmt.Sprintf("%d/%d", ready, desired),
		UpToDate:  deployment.Status.UpdatedReplicas,
		Available: deployment.Status.AvailableReplicas,
		Age:       FormatAge(deployment.CreationTimestamp.Time),
		Labels:    deployment.Labels,
		Raw:       deployment,
	}
}

// NodeFromK8s converts a K8s node to our model
func NodeFromK8s(node *corev1.Node) Node {
	status := "NotReady"
	for _, condition := range node.Status.Conditions {
		if condition.Type == corev1.NodeReady && condition.Status == corev1.ConditionTrue {
			status = "Ready"
			break
		}
	}

	roles := []string{}
	for k := range node.Labels {
		if strings.HasPrefix(k, "node-role.kubernetes.io/") {
			role := strings.TrimPrefix(k, "node-role.kubernetes.io/")
			if role == "" {
				role = "master"
			}
			roles = append(roles, role)
		}
	}
	if len(roles) == 0 {
		roles = append(roles, "worker")
	}

	conditions := []NodeCondition{}
	for _, c := range node.Status.Conditions {
		conditions = append(conditions, NodeCondition{
			Type:    string(c.Type),
			Status:  string(c.Status),
			Reason:  c.Reason,
			Message: c.Message,
		})
	}

	resources := NodeResources{
		CPUCapacity:    node.Status.Capacity.Cpu().String(),
		CPUAllocatable: node.Status.Allocatable.Cpu().String(),
		MemCapacity:    node.Status.Capacity.Memory().String(),
		MemAllocatable: node.Status.Allocatable.Memory().String(),
		PodCapacity:    node.Status.Capacity.Pods().String(),
	}

	return Node{
		Name:       node.Name,
		Status:     status,
		Roles:      roles,
		Age:        FormatAge(node.CreationTimestamp.Time),
		Version:    node.Status.NodeInfo.KubeletVersion,
		Labels:     node.Labels,
		Conditions: conditions,
		Resources:  resources,
		Raw:        node,
	}
}

// ServiceFromK8s converts a K8s service to our model
func ServiceFromK8s(service *corev1.Service) Service {
	ports := []string{}
	for _, port := range service.Spec.Ports {
		portStr := fmt.Sprintf("%d", port.Port)
		if port.NodePort > 0 {
			portStr = fmt.Sprintf("%d:%d", port.Port, port.NodePort)
		}
		if port.Name != "" {
			portStr = fmt.Sprintf("%s/%s", port.Name, portStr)
		}
		ports = append(ports, portStr)
	}

	return Service{
		Name:      service.Name,
		Namespace: service.Namespace,
		Type:      string(service.Spec.Type),
		ClusterIP: service.Spec.ClusterIP,
		Ports:     ports,
		Age:       FormatAge(service.CreationTimestamp.Time),
		Labels:    service.Labels,
		Raw:       service,
	}
}

// IngressFromK8s converts a K8s ingress to our model
func IngressFromK8s(ingress *networkingv1.Ingress) Ingress {
	hosts := []string{}
	ports := []string{}
	addresses := []string{}

	for _, rule := range ingress.Spec.Rules {
		if rule.Host != "" {
			hosts = append(hosts, rule.Host)
		}
	}

	if len(ingress.Spec.TLS) > 0 {
		ports = append(ports, "443")
	}
	if len(ports) == 0 {
		ports = append(ports, "80")
	}

	for _, ing := range ingress.Status.LoadBalancer.Ingress {
		if ing.IP != "" {
			addresses = append(addresses, ing.IP)
		}
		if ing.Hostname != "" {
			addresses = append(addresses, ing.Hostname)
		}
	}

	address := strings.Join(addresses, ",")
	if address == "" {
		address = "<pending>"
	}

	return Ingress{
		Name:      ingress.Name,
		Namespace: ingress.Namespace,
		Hosts:     hosts,
		Address:   address,
		Ports:     ports,
		Age:       FormatAge(ingress.CreationTimestamp.Time),
		Labels:    ingress.Labels,
		Raw:       ingress,
	}
}

// ConfigMapFromK8s converts a K8s configmap to our model
func ConfigMapFromK8s(cm *corev1.ConfigMap) ConfigMap {
	return ConfigMap{
		Name:      cm.Name,
		Namespace: cm.Namespace,
		Data:      len(cm.Data) + len(cm.BinaryData),
		Age:       FormatAge(cm.CreationTimestamp.Time),
		Labels:    cm.Labels,
		Raw:       cm,
	}
}

// SecretFromK8s converts a K8s secret to our model
func SecretFromK8s(secret *corev1.Secret) Secret {
	return Secret{
		Name:      secret.Name,
		Namespace: secret.Namespace,
		Type:      string(secret.Type),
		Data:      len(secret.Data),
		Age:       FormatAge(secret.CreationTimestamp.Time),
		Labels:    secret.Labels,
		Raw:       secret,
	}
}

// JobFromK8s converts a K8s job to our model
func JobFromK8s(job *batchv1.Job) Job {
	completions := "0/1"
	if job.Spec.Completions != nil {
		completions = fmt.Sprintf("%d/%d", job.Status.Succeeded, *job.Spec.Completions)
	}

	duration := ""
	if job.Status.StartTime != nil {
		if job.Status.CompletionTime != nil {
			duration = job.Status.CompletionTime.Sub(job.Status.StartTime.Time).String()
		} else {
			duration = time.Since(job.Status.StartTime.Time).String()
		}
	}

	return Job{
		Name:        job.Name,
		Namespace:   job.Namespace,
		Completions: completions,
		Duration:    duration,
		Age:         FormatAge(job.CreationTimestamp.Time),
		Labels:      job.Labels,
		Raw:         job,
	}
}

// EventFromK8s converts a K8s event to our model
func EventFromK8s(event *corev1.Event) Event {
	return Event{
		Namespace:       event.Namespace,
		LastSeen:        event.LastTimestamp.Time,
		FirstSeen:       event.FirstTimestamp.Time,
		Count:           event.Count,
		Name:            event.InvolvedObject.Name,
		Kind:            event.InvolvedObject.Kind,
		Subobject:       event.InvolvedObject.FieldPath,
		Type:            event.Type,
		Reason:          event.Reason,
		Message:         event.Message,
		SourceHost:      event.Source.Host,
		SourceComponent: event.Source.Component,
	}
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// FormatAge formats a time as a human-readable age
func FormatAge(t time.Time) string {
	duration := time.Since(t)

	if duration.Hours() > 24*365 {
		years := int(duration.Hours() / (24 * 365))
		return fmt.Sprintf("%dy", years)
	}
	if duration.Hours() > 24*30 {
		months := int(duration.Hours() / (24 * 30))
		return fmt.Sprintf("%dmo", months)
	}
	if duration.Hours() > 24 {
		days := int(duration.Hours() / 24)
		return fmt.Sprintf("%dd", days)
	}
	if duration.Hours() > 1 {
		return fmt.Sprintf("%dh", int(duration.Hours()))
	}
	if duration.Minutes() > 1 {
		return fmt.Sprintf("%dm", int(duration.Minutes()))
	}
	return fmt.Sprintf("%ds", int(duration.Seconds()))
}

// ResourceToYAML converts a resource to YAML
func ResourceToYAML(resource interface{}) (string, error) {
	// Convert to unstructured first to clean metadata
	unstructuredObj, err := toUnstructured(resource)
	if err != nil {
		return "", err
	}

	// Clean metadata
	cleanMetadata(unstructuredObj)

	// Convert to YAML
	yamlBytes, err := yaml.Marshal(unstructuredObj)
	if err != nil {
		return "", err
	}

	return string(yamlBytes), nil
}

// toUnstructured converts any resource to unstructured
func toUnstructured(resource interface{}) (*unstructured.Unstructured, error) {
	// Implementation would convert the resource to unstructured format
	// This is a simplified version
	return &unstructured.Unstructured{}, nil
}

// cleanMetadata removes server-managed fields from metadata
func cleanMetadata(obj *unstructured.Unstructured) {
	metadata, found, _ := unstructured.NestedMap(obj.Object, "metadata")
	if !found {
		return
	}

	// Remove server-managed fields
	delete(metadata, "managedFields")
	delete(metadata, "resourceVersion")
	delete(metadata, "uid")
	delete(metadata, "selfLink")
	delete(metadata, "generation")
	delete(metadata, "creationTimestamp")

	// Remove empty annotations and labels
	if annotations, ok := metadata["annotations"].(map[string]interface{}); ok && len(annotations) == 0 {
		delete(metadata, "annotations")
	}
	if labels, ok := metadata["labels"].(map[string]interface{}); ok && len(labels) == 0 {
		delete(metadata, "labels")
	}

	unstructured.SetNestedMap(obj.Object, metadata, "metadata")
}
