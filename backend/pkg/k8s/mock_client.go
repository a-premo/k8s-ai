package k8s

import (
	"fmt"
	"time"

	"github.com/gorilla/websocket"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// mockClient provides mock K8s data for demo mode
type mockClient struct{}

// NewMockClient creates a new mock K8s client
func NewMockClient() Client {
	return &mockClient{}
}

func (m *mockClient) Health() error {
	return nil
}

// Mock Workloads
func (m *mockClient) GetPods(namespace string) (*corev1.PodList, error) {
	pods := &corev1.PodList{
		Items: []corev1.Pod{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "nginx-deployment-7d8c6f8b9c-xyz12",
					Namespace:         "default",
					Labels:            map[string]string{"app": "nginx", "version": "v1.21"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-48 * time.Hour)),
				},
				Spec: corev1.PodSpec{
					NodeName: "node-1",
					Containers: []corev1.Container{
						{Name: "nginx", Image: "nginx:1.21"},
					},
				},
				Status: corev1.PodStatus{
					Phase: corev1.PodRunning,
					ContainerStatuses: []corev1.ContainerStatus{
						{Name: "nginx", Ready: true, RestartCount: 0},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "redis-master-78d9c4b5a-abc34",
					Namespace:         "default",
					Labels:            map[string]string{"app": "redis", "role": "master"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-1 * time.Hour)),
				},
				Spec: corev1.PodSpec{
					NodeName: "node-2",
					Containers: []corev1.Container{
						{Name: "redis", Image: "redis:6-alpine"},
					},
				},
				Status: corev1.PodStatus{
					Phase: corev1.PodFailed,
					ContainerStatuses: []corev1.ContainerStatus{
						{
							Name:         "redis",
							Ready:        false,
							RestartCount: 12,
							State: corev1.ContainerState{
								Waiting: &corev1.ContainerStateWaiting{
									Reason: "CrashLoopBackOff",
								},
							},
						},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "postgres-db-5f8c7d9b8-def56",
					Namespace:         "default",
					Labels:            map[string]string{"app": "postgres", "tier": "database"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-12 * time.Hour)),
				},
				Spec: corev1.PodSpec{
					NodeName: "node-1",
					Containers: []corev1.Container{
						{Name: "postgres", Image: "postgres:13"},
					},
				},
				Status: corev1.PodStatus{
					Phase: corev1.PodRunning,
					ContainerStatuses: []corev1.ContainerStatus{
						{Name: "postgres", Ready: true, RestartCount: 1},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "frontend-app-6c9d8e7f-ghi78",
					Namespace:         "production",
					Labels:            map[string]string{"app": "frontend", "env": "prod"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-3 * time.Hour)),
				},
				Spec: corev1.PodSpec{
					NodeName: "node-2",
					Containers: []corev1.Container{
						{Name: "frontend", Image: "myapp/frontend:v2.1.0"},
					},
				},
				Status: corev1.PodStatus{
					Phase: corev1.PodRunning,
					ContainerStatuses: []corev1.ContainerStatus{
						{Name: "frontend", Ready: true, RestartCount: 0},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "monitoring-agent-k8s-xyz",
					Namespace:         "kube-system",
					Labels:            map[string]string{"app": "monitoring", "component": "agent"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-72 * time.Hour)),
				},
				Spec: corev1.PodSpec{
					NodeName: "node-1",
					Containers: []corev1.Container{
						{Name: "agent", Image: "monitoring/agent:latest"},
					},
				},
				Status: corev1.PodStatus{
					Phase: corev1.PodRunning,
					ContainerStatuses: []corev1.ContainerStatus{
						{Name: "agent", Ready: true, RestartCount: 2},
					},
				},
			},
		},
	}

	if namespace != "" && namespace != "all" && namespace != "All Namespaces" {
		filtered := []corev1.Pod{}
		for _, pod := range pods.Items {
			if pod.Namespace == namespace {
				filtered = append(filtered, pod)
			}
		}
		pods.Items = filtered
	}

	return pods, nil
}

func (m *mockClient) GetDeployments(namespace string) (*appsv1.DeploymentList, error) {
	replicas1 := int32(3)
	replicas2 := int32(2)
	replicas3 := int32(5)
	return &appsv1.DeploymentList{
		Items: []appsv1.Deployment{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "nginx-deployment",
					Namespace:         "default",
					Labels:            map[string]string{"app": "nginx"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-7 * 24 * time.Hour)),
				},
				Spec: appsv1.DeploymentSpec{
					Replicas: &replicas1,
				},
				Status: appsv1.DeploymentStatus{
					ReadyReplicas:     3,
					UpdatedReplicas:   3,
					AvailableReplicas: 3,
					Replicas:          3,
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "api-backend",
					Namespace:         "default",
					Labels:            map[string]string{"app": "api", "tier": "backend"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-14 * 24 * time.Hour)),
				},
				Spec: appsv1.DeploymentSpec{
					Replicas: &replicas2,
				},
				Status: appsv1.DeploymentStatus{
					ReadyReplicas:     2,
					UpdatedReplicas:   2,
					AvailableReplicas: 2,
					Replicas:          2,
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "frontend-app",
					Namespace:         "production",
					Labels:            map[string]string{"app": "frontend", "env": "prod"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
				},
				Spec: appsv1.DeploymentSpec{
					Replicas: &replicas3,
				},
				Status: appsv1.DeploymentStatus{
					ReadyReplicas:     5,
					UpdatedReplicas:   5,
					AvailableReplicas: 5,
					Replicas:          5,
				},
			},
		},
	}, nil
}

func (m *mockClient) GetDaemonSets(namespace string) (*appsv1.DaemonSetList, error) {
	return &appsv1.DaemonSetList{
		Items: []appsv1.DaemonSet{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "fluentd",
					Namespace:         "kube-system",
					Labels:            map[string]string{"app": "fluentd", "component": "logging"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
				},
				Status: appsv1.DaemonSetStatus{
					DesiredNumberScheduled: 3,
					CurrentNumberScheduled: 3,
					NumberReady:            3,
					UpdatedNumberScheduled: 3,
					NumberAvailable:        3,
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "node-exporter",
					Namespace:         "monitoring",
					Labels:            map[string]string{"app": "node-exporter", "component": "monitoring"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-45 * 24 * time.Hour)),
				},
				Status: appsv1.DaemonSetStatus{
					DesiredNumberScheduled: 3,
					CurrentNumberScheduled: 3,
					NumberReady:            3,
					UpdatedNumberScheduled: 3,
					NumberAvailable:        3,
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "network-agent",
					Namespace:         "kube-system",
					Labels:            map[string]string{"app": "network-agent", "component": "networking"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-60 * 24 * time.Hour)),
				},
				Status: appsv1.DaemonSetStatus{
					DesiredNumberScheduled: 3,
					CurrentNumberScheduled: 2,
					NumberReady:            2,
					UpdatedNumberScheduled: 2,
					NumberAvailable:        2,
				},
			},
		},
	}, nil
}

func (m *mockClient) GetStatefulSets(namespace string) (*appsv1.StatefulSetList, error) {
	replicas1 := int32(3)
	replicas2 := int32(1)
	replicas3 := int32(5)
	return &appsv1.StatefulSetList{
		Items: []appsv1.StatefulSet{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "mysql",
					Namespace:         "default",
					Labels:            map[string]string{"app": "mysql", "tier": "database"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-14 * 24 * time.Hour)),
				},
				Spec: appsv1.StatefulSetSpec{
					Replicas: &replicas1,
				},
				Status: appsv1.StatefulSetStatus{
					ReadyReplicas: 3,
					Replicas:      3,
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "redis-cluster",
					Namespace:         "default",
					Labels:            map[string]string{"app": "redis", "mode": "cluster"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-21 * 24 * time.Hour)),
				},
				Spec: appsv1.StatefulSetSpec{
					Replicas: &replicas2,
				},
				Status: appsv1.StatefulSetStatus{
					ReadyReplicas: 1,
					Replicas:      1,
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "elasticsearch",
					Namespace:         "logging",
					Labels:            map[string]string{"app": "elasticsearch", "component": "search"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-40 * 24 * time.Hour)),
				},
				Spec: appsv1.StatefulSetSpec{
					Replicas: &replicas3,
				},
				Status: appsv1.StatefulSetStatus{
					ReadyReplicas: 5,
					Replicas:      5,
				},
			},
		},
	}, nil
}

func (m *mockClient) GetReplicaSets(namespace string) (*appsv1.ReplicaSetList, error) {
	replicas1 := int32(3)
	replicas2 := int32(2)
	replicas3 := int32(0)
	return &appsv1.ReplicaSetList{
		Items: []appsv1.ReplicaSet{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "nginx-deployment-7d8c6f8b9c",
					Namespace:         "default",
					Labels:            map[string]string{"app": "nginx", "pod-template-hash": "7d8c6f8b9c"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-7 * 24 * time.Hour)),
				},
				Spec: appsv1.ReplicaSetSpec{
					Replicas: &replicas1,
				},
				Status: appsv1.ReplicaSetStatus{
					Replicas:      3,
					ReadyReplicas: 3,
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "api-backend-8e9f0a1b2c",
					Namespace:         "default",
					Labels:            map[string]string{"app": "api", "pod-template-hash": "8e9f0a1b2c"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-14 * 24 * time.Hour)),
				},
				Spec: appsv1.ReplicaSetSpec{
					Replicas: &replicas2,
				},
				Status: appsv1.ReplicaSetStatus{
					Replicas:      2,
					ReadyReplicas: 2,
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "nginx-deployment-5c6d7e8f9a",
					Namespace:         "default",
					Labels:            map[string]string{"app": "nginx", "pod-template-hash": "5c6d7e8f9a"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-10 * 24 * time.Hour)),
				},
				Spec: appsv1.ReplicaSetSpec{
					Replicas: &replicas3,
				},
				Status: appsv1.ReplicaSetStatus{
					Replicas:      0,
					ReadyReplicas: 0,
				},
			},
		},
	}, nil
}

func (m *mockClient) GetJobs(namespace string) (*batchv1.JobList, error) {
	completions1 := int32(1)
	completions2 := int32(5)
	completions3 := int32(3)
	return &batchv1.JobList{
		Items: []batchv1.Job{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "backup-job",
					Namespace:         "default",
					Labels:            map[string]string{"app": "backup", "type": "database"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-2 * time.Hour)),
				},
				Spec: batchv1.JobSpec{
					Completions: &completions1,
				},
				Status: batchv1.JobStatus{
					Succeeded:      1,
					StartTime:      &metav1.Time{Time: time.Now().Add(-2 * time.Hour)},
					CompletionTime: &metav1.Time{Time: time.Now().Add(-1 * time.Hour)},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "data-migration",
					Namespace:         "default",
					Labels:            map[string]string{"app": "migration", "type": "data"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-6 * time.Hour)),
				},
				Spec: batchv1.JobSpec{
					Completions: &completions2,
				},
				Status: batchv1.JobStatus{
					Succeeded:      5,
					StartTime:      &metav1.Time{Time: time.Now().Add(-6 * time.Hour)},
					CompletionTime: &metav1.Time{Time: time.Now().Add(-4 * time.Hour)},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "cleanup-job",
					Namespace:         "production",
					Labels:            map[string]string{"app": "cleanup", "type": "maintenance"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * time.Minute)),
				},
				Spec: batchv1.JobSpec{
					Completions: &completions3,
				},
				Status: batchv1.JobStatus{
					Active:    1,
					Succeeded: 2,
					StartTime: &metav1.Time{Time: time.Now().Add(-30 * time.Minute)},
				},
			},
		},
	}, nil
}

func (m *mockClient) GetCronJobs(namespace string) (*batchv1.CronJobList, error) {
	return &batchv1.CronJobList{
		Items: []batchv1.CronJob{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "backup-cronjob",
					Namespace:         "default",
					Labels:            map[string]string{"app": "backup", "schedule": "daily"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
				},
				Spec: batchv1.CronJobSpec{
					Schedule: "0 2 * * *",
				},
				Status: batchv1.CronJobStatus{
					LastScheduleTime: &metav1.Time{Time: time.Now().Add(-20 * time.Hour)},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "cleanup-cronjob",
					Namespace:         "default",
					Labels:            map[string]string{"app": "cleanup", "schedule": "weekly"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-60 * 24 * time.Hour)),
				},
				Spec: batchv1.CronJobSpec{
					Schedule: "0 0 * * 0",
				},
				Status: batchv1.CronJobStatus{
					LastScheduleTime: &metav1.Time{Time: time.Now().Add(-3 * 24 * time.Hour)},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "report-generator",
					Namespace:         "production",
					Labels:            map[string]string{"app": "reports", "schedule": "hourly"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-15 * 24 * time.Hour)),
				},
				Spec: batchv1.CronJobSpec{
					Schedule: "0 * * * *",
				},
				Status: batchv1.CronJobStatus{
					LastScheduleTime: &metav1.Time{Time: time.Now().Add(-1 * time.Hour)},
				},
			},
		},
	}, nil
}

// Mock Config
func (m *mockClient) GetConfigMaps(namespace string) (*corev1.ConfigMapList, error) {
	return &corev1.ConfigMapList{
		Items: []corev1.ConfigMap{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "app-config",
					Namespace:         "default",
					Labels:            map[string]string{"app": "myapp", "component": "config"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-5 * 24 * time.Hour)),
				},
				Data: map[string]string{
					"config.yaml":    "server:\n  port: 8080\n  host: 0.0.0.0\ndatabase:\n  host: postgres\n  port: 5432",
					"app.properties": "debug=true\nlog.level=info\nmax.connections=100",
					"nginx.conf":     "server { listen 80; location / { proxy_pass http://backend; } }",
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "database-config",
					Namespace:         "default",
					Labels:            map[string]string{"app": "postgres", "component": "database"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-10 * 24 * time.Hour)),
				},
				Data: map[string]string{
					"postgresql.conf": "max_connections = 200\nshared_buffers = 256MB\neffective_cache_size = 1GB",
					"pg_hba.conf":     "host all all 0.0.0.0/0 md5",
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "frontend-config",
					Namespace:         "production",
					Labels:            map[string]string{"app": "frontend", "env": "prod"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-20 * 24 * time.Hour)),
				},
				Data: map[string]string{
					"config.json":   `{"apiUrl": "https://api.example.com", "theme": "dark", "analytics": true}`,
					"feature-flags": "feature.newUI=true\nfeature.betaFeatures=false",
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "monitoring-config",
					Namespace:         "kube-system",
					Labels:            map[string]string{"app": "prometheus", "component": "monitoring"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-45 * 24 * time.Hour)),
				},
				Data: map[string]string{
					"prometheus.yml": "global:\n  scrape_interval: 15s\nscrape_configs:\n  - job_name: kubernetes-pods",
					"alerting.yml":   "groups:\n  - name: kubernetes\n    rules:\n      - alert: PodCrashLooping",
				},
			},
		},
	}, nil
}

func (m *mockClient) GetSecrets(namespace string) (*corev1.SecretList, error) {
	return &corev1.SecretList{
		Items: []corev1.Secret{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "db-secret",
					Namespace:         "default",
					Labels:            map[string]string{"app": "postgres", "type": "database"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-10 * 24 * time.Hour)),
				},
				Type: corev1.SecretTypeOpaque,
				Data: map[string][]byte{
					"username": []byte("admin"),
					"password": []byte("***"),
					"database": []byte("myapp"),
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "api-keys",
					Namespace:         "default",
					Labels:            map[string]string{"app": "api", "type": "credentials"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-15 * 24 * time.Hour)),
				},
				Type: corev1.SecretTypeOpaque,
				Data: map[string][]byte{
					"stripe-key":   []byte("sk_test_***"),
					"jwt-secret":   []byte("***"),
					"github-token": []byte("ghp_***"),
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "tls-certificate",
					Namespace:         "production",
					Labels:            map[string]string{"app": "frontend", "type": "tls"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
				},
				Type: corev1.SecretTypeTLS,
				Data: map[string][]byte{
					"tls.crt": []byte("-----BEGIN CERTIFICATE-----\n***\n-----END CERTIFICATE-----"),
					"tls.key": []byte("-----BEGIN PRIVATE KEY-----\n***\n-----END PRIVATE KEY-----"),
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "registry-secret",
					Namespace:         "kube-system",
					Labels:            map[string]string{"type": "docker-registry"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-60 * 24 * time.Hour)),
				},
				Type: corev1.SecretTypeDockerConfigJson,
				Data: map[string][]byte{
					".dockerconfigjson": []byte(`{"auths":{"registry.example.com":{"username":"user","password":"***"}}}`),
				},
			},
		},
	}, nil
}

// Mock Network
func (m *mockClient) GetServices(namespace string) (*corev1.ServiceList, error) {
	return &corev1.ServiceList{
		Items: []corev1.Service{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "nginx-service",
					Namespace:         "default",
					Labels:            map[string]string{"app": "nginx", "component": "frontend"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-7 * 24 * time.Hour)),
				},
				Spec: corev1.ServiceSpec{
					Type:      corev1.ServiceTypeLoadBalancer,
					ClusterIP: "10.96.0.1",
					Ports: []corev1.ServicePort{
						{Name: "http", Port: 80, NodePort: 30080},
						{Name: "https", Port: 443, NodePort: 30443},
					},
				},
				Status: corev1.ServiceStatus{
					LoadBalancer: corev1.LoadBalancerStatus{
						Ingress: []corev1.LoadBalancerIngress{
							{IP: "203.0.113.10"},
						},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "api-service",
					Namespace:         "default",
					Labels:            map[string]string{"app": "api", "tier": "backend"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-14 * 24 * time.Hour)),
				},
				Spec: corev1.ServiceSpec{
					Type:      corev1.ServiceTypeClusterIP,
					ClusterIP: "10.96.1.5",
					Ports: []corev1.ServicePort{
						{Name: "http", Port: 8080},
						{Name: "metrics", Port: 9090},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "database-service",
					Namespace:         "default",
					Labels:            map[string]string{"app": "postgres", "tier": "database"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-14 * 24 * time.Hour)),
				},
				Spec: corev1.ServiceSpec{
					Type:      corev1.ServiceTypeClusterIP,
					ClusterIP: "10.96.2.10",
					Ports: []corev1.ServicePort{
						{Name: "postgres", Port: 5432},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "monitoring-service",
					Namespace:         "kube-system",
					Labels:            map[string]string{"app": "prometheus", "component": "monitoring"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-45 * 24 * time.Hour)),
				},
				Spec: corev1.ServiceSpec{
					Type:      corev1.ServiceTypeNodePort,
					ClusterIP: "10.96.3.15",
					Ports: []corev1.ServicePort{
						{Name: "web", Port: 9090, NodePort: 30900},
					},
				},
			},
		},
	}, nil
}

func (m *mockClient) GetEndpoints(namespace string) (*corev1.EndpointsList, error) {
	return &corev1.EndpointsList{
		Items: []corev1.Endpoints{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "nginx-service",
					Namespace: "default",
					Labels:    map[string]string{"app": "nginx"},
				},
				Subsets: []corev1.EndpointSubset{
					{
						Addresses: []corev1.EndpointAddress{
							{IP: "10.244.1.5"},
							{IP: "10.244.2.6"},
							{IP: "10.244.3.7"},
						},
						Ports: []corev1.EndpointPort{
							{Port: 80, Name: "http"},
							{Port: 443, Name: "https"},
						},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "api-service",
					Namespace: "default",
					Labels:    map[string]string{"app": "api"},
				},
				Subsets: []corev1.EndpointSubset{
					{
						Addresses: []corev1.EndpointAddress{
							{IP: "10.244.1.8"},
							{IP: "10.244.2.9"},
						},
						Ports: []corev1.EndpointPort{
							{Port: 8080, Name: "http"},
							{Port: 9090, Name: "metrics"},
						},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "database-service",
					Namespace: "default",
					Labels:    map[string]string{"app": "postgres"},
				},
				Subsets: []corev1.EndpointSubset{
					{
						Addresses: []corev1.EndpointAddress{
							{IP: "10.244.1.10"},
						},
						Ports: []corev1.EndpointPort{
							{Port: 5432, Name: "postgres"},
						},
					},
				},
			},
		},
	}, nil
}

func (m *mockClient) GetIngresses(namespace string) (*networkingv1.IngressList, error) {
	return &networkingv1.IngressList{
		Items: []networkingv1.Ingress{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "app-ingress",
					Namespace:         "default",
					Labels:            map[string]string{"app": "myapp", "component": "ingress"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-3 * 24 * time.Hour)),
				},
				Spec: networkingv1.IngressSpec{
					Rules: []networkingv1.IngressRule{
						{
							Host: "app.example.com",
							IngressRuleValue: networkingv1.IngressRuleValue{
								HTTP: &networkingv1.HTTPIngressRuleValue{
									Paths: []networkingv1.HTTPIngressPath{
										{
											Path: "/",
											PathType: func() *networkingv1.PathType {
												pt := networkingv1.PathTypePrefix
												return &pt
											}(),
										},
									},
								},
							},
						},
						{
							Host: "api.example.com",
							IngressRuleValue: networkingv1.IngressRuleValue{
								HTTP: &networkingv1.HTTPIngressRuleValue{
									Paths: []networkingv1.HTTPIngressPath{
										{
											Path: "/api",
											PathType: func() *networkingv1.PathType {
												pt := networkingv1.PathTypePrefix
												return &pt
											}(),
										},
									},
								},
							},
						},
					},
				},
				Status: networkingv1.IngressStatus{
					LoadBalancer: networkingv1.IngressLoadBalancerStatus{
						Ingress: []networkingv1.IngressLoadBalancerIngress{
							{IP: "203.0.113.10"},
						},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "admin-ingress",
					Namespace:         "default",
					Labels:            map[string]string{"app": "admin", "component": "ingress"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-10 * 24 * time.Hour)),
				},
				Spec: networkingv1.IngressSpec{
					Rules: []networkingv1.IngressRule{
						{Host: "admin.example.com"},
					},
				},
				Status: networkingv1.IngressStatus{
					LoadBalancer: networkingv1.IngressLoadBalancerStatus{
						Ingress: []networkingv1.IngressLoadBalancerIngress{
							{IP: "203.0.113.20"},
						},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "monitoring-dashboard",
					Namespace:         "kube-system",
					Labels:            map[string]string{"app": "grafana", "component": "dashboard"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-20 * 24 * time.Hour)),
				},
				Spec: networkingv1.IngressSpec{
					Rules: []networkingv1.IngressRule{
						{Host: "grafana.example.com"},
					},
				},
				Status: networkingv1.IngressStatus{
					LoadBalancer: networkingv1.IngressLoadBalancerStatus{
						Ingress: []networkingv1.IngressLoadBalancerIngress{
							{IP: "203.0.113.30"},
						},
					},
				},
			},
		},
	}, nil
}

func (m *mockClient) GetNetworkPolicies(namespace string) (*networkingv1.NetworkPolicyList, error) {
	return &networkingv1.NetworkPolicyList{
		Items: []networkingv1.NetworkPolicy{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "default-deny",
					Namespace:         "default",
					Labels:            map[string]string{"policy": "security", "type": "deny-all"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-20 * 24 * time.Hour)),
				},
				Spec: networkingv1.NetworkPolicySpec{
					PodSelector: metav1.LabelSelector{},
					PolicyTypes: []networkingv1.PolicyType{
						networkingv1.PolicyTypeIngress,
						networkingv1.PolicyTypeEgress,
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "allow-frontend",
					Namespace:         "default",
					Labels:            map[string]string{"policy": "security", "type": "allow"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-15 * 24 * time.Hour)),
				},
				Spec: networkingv1.NetworkPolicySpec{
					PodSelector: metav1.LabelSelector{
						MatchLabels: map[string]string{"app": "frontend"},
					},
					PolicyTypes: []networkingv1.PolicyType{
						networkingv1.PolicyTypeIngress,
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "database-isolation",
					Namespace:         "production",
					Labels:            map[string]string{"policy": "security", "type": "isolation"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-25 * 24 * time.Hour)),
				},
				Spec: networkingv1.NetworkPolicySpec{
					PodSelector: metav1.LabelSelector{
						MatchLabels: map[string]string{"tier": "database"},
					},
					PolicyTypes: []networkingv1.PolicyType{
						networkingv1.PolicyTypeIngress,
						networkingv1.PolicyTypeEgress,
					},
				},
			},
		},
	}, nil
}

// Mock Storage
func (m *mockClient) GetPersistentVolumes() (*corev1.PersistentVolumeList, error) {
	return &corev1.PersistentVolumeList{
		Items: []corev1.PersistentVolume{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "pv-data",
					Labels:            map[string]string{"type": "local", "usage": "database"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-60 * 24 * time.Hour)),
				},
				Spec: corev1.PersistentVolumeSpec{
					Capacity: corev1.ResourceList{
						corev1.ResourceStorage: resource.MustParse("10Gi"),
					},
					AccessModes: []corev1.PersistentVolumeAccessMode{
						corev1.ReadWriteOnce,
					},
					PersistentVolumeReclaimPolicy: corev1.PersistentVolumeReclaimRetain,
					StorageClassName:              "standard",
				},
				Status: corev1.PersistentVolumeStatus{
					Phase: corev1.VolumeBound,
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "pv-logs",
					Labels:            map[string]string{"type": "network", "usage": "logging"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-45 * 24 * time.Hour)),
				},
				Spec: corev1.PersistentVolumeSpec{
					Capacity: corev1.ResourceList{
						corev1.ResourceStorage: resource.MustParse("50Gi"),
					},
					AccessModes: []corev1.PersistentVolumeAccessMode{
						corev1.ReadWriteMany,
					},
					PersistentVolumeReclaimPolicy: corev1.PersistentVolumeReclaimDelete,
					StorageClassName:              "fast-ssd",
				},
				Status: corev1.PersistentVolumeStatus{
					Phase: corev1.VolumeAvailable,
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "pv-backups",
					Labels:            map[string]string{"type": "network", "usage": "backup"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				Spec: corev1.PersistentVolumeSpec{
					Capacity: corev1.ResourceList{
						corev1.ResourceStorage: resource.MustParse("100Gi"),
					},
					AccessModes: []corev1.PersistentVolumeAccessMode{
						corev1.ReadWriteOnce,
					},
					PersistentVolumeReclaimPolicy: corev1.PersistentVolumeReclaimRetain,
					StorageClassName:              "standard",
				},
				Status: corev1.PersistentVolumeStatus{
					Phase: corev1.VolumeAvailable,
				},
			},
		},
	}, nil
}

func (m *mockClient) GetPersistentVolumeClaims(namespace string) (*corev1.PersistentVolumeClaimList, error) {
	storageClass1 := "standard"
	storageClass2 := "fast-ssd"
	storageClass3 := "standard"
	return &corev1.PersistentVolumeClaimList{
		Items: []corev1.PersistentVolumeClaim{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "data-claim",
					Namespace:         "default",
					Labels:            map[string]string{"app": "postgres", "component": "storage"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
				},
				Spec: corev1.PersistentVolumeClaimSpec{
					AccessModes: []corev1.PersistentVolumeAccessMode{
						corev1.ReadWriteOnce,
					},
					StorageClassName: &storageClass1,
					Resources: corev1.ResourceRequirements{
						Requests: corev1.ResourceList{
							corev1.ResourceStorage: resource.MustParse("10Gi"),
						},
					},
				},
				Status: corev1.PersistentVolumeClaimStatus{
					Phase: corev1.ClaimBound,
					Capacity: corev1.ResourceList{
						corev1.ResourceStorage: resource.MustParse("10Gi"),
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "cache-claim",
					Namespace:         "default",
					Labels:            map[string]string{"app": "redis", "component": "storage"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-15 * 24 * time.Hour)),
				},
				Spec: corev1.PersistentVolumeClaimSpec{
					AccessModes: []corev1.PersistentVolumeAccessMode{
						corev1.ReadWriteOnce,
					},
					StorageClassName: &storageClass2,
					Resources: corev1.ResourceRequirements{
						Requests: corev1.ResourceList{
							corev1.ResourceStorage: resource.MustParse("5Gi"),
						},
					},
				},
				Status: corev1.PersistentVolumeClaimStatus{
					Phase: corev1.ClaimBound,
					Capacity: corev1.ResourceList{
						corev1.ResourceStorage: resource.MustParse("5Gi"),
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "log-storage",
					Namespace:         "kube-system",
					Labels:            map[string]string{"app": "elasticsearch", "component": "storage"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-40 * 24 * time.Hour)),
				},
				Spec: corev1.PersistentVolumeClaimSpec{
					AccessModes: []corev1.PersistentVolumeAccessMode{
						corev1.ReadWriteOnce,
					},
					StorageClassName: &storageClass3,
					Resources: corev1.ResourceRequirements{
						Requests: corev1.ResourceList{
							corev1.ResourceStorage: resource.MustParse("20Gi"),
						},
					},
				},
				Status: corev1.PersistentVolumeClaimStatus{
					Phase: corev1.ClaimBound,
					Capacity: corev1.ResourceList{
						corev1.ResourceStorage: resource.MustParse("20Gi"),
					},
				},
			},
		},
	}, nil
}

func (m *mockClient) GetStorageClasses() (*storagev1.StorageClassList, error) {
	reclaimPolicy1 := corev1.PersistentVolumeReclaimDelete
	reclaimPolicy2 := corev1.PersistentVolumeReclaimRetain
	bindingMode1 := storagev1.VolumeBindingImmediate
	bindingMode2 := storagev1.VolumeBindingWaitForFirstConsumer
	expansion1 := true
	expansion2 := false

	return &storagev1.StorageClassList{
		Items: []storagev1.StorageClass{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "standard",
					Labels:            map[string]string{"type": "gp2", "performance": "standard"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				Provisioner:          "kubernetes.io/aws-ebs",
				ReclaimPolicy:        &reclaimPolicy1,
				VolumeBindingMode:    &bindingMode1,
				AllowVolumeExpansion: &expansion1,
				Parameters: map[string]string{
					"type": "gp2",
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "fast-ssd",
					Labels:            map[string]string{"type": "gp3", "performance": "high"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				Provisioner:          "kubernetes.io/aws-ebs",
				ReclaimPolicy:        &reclaimPolicy1,
				VolumeBindingMode:    &bindingMode2,
				AllowVolumeExpansion: &expansion1,
				Parameters: map[string]string{
					"type": "gp3",
					"iops": "3000",
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "backup-storage",
					Labels:            map[string]string{"type": "sc1", "performance": "throughput"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				Provisioner:          "kubernetes.io/aws-ebs",
				ReclaimPolicy:        &reclaimPolicy2,
				VolumeBindingMode:    &bindingMode1,
				AllowVolumeExpansion: &expansion2,
				Parameters: map[string]string{
					"type": "sc1",
				},
			},
		},
	}, nil
}

// Mock Access Control
func (m *mockClient) GetServiceAccounts(namespace string) (*corev1.ServiceAccountList, error) {
	return &corev1.ServiceAccountList{
		Items: []corev1.ServiceAccount{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "default",
					Namespace:         "default",
					Labels:            map[string]string{"component": "system"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				Secrets: []corev1.ObjectReference{
					{Name: "default-token-xyz"},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "app-service-account",
					Namespace:         "default",
					Labels:            map[string]string{"app": "myapp", "component": "service-account"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
				},
				Secrets: []corev1.ObjectReference{
					{Name: "app-service-account-token-abc"},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "monitoring-sa",
					Namespace:         "kube-system",
					Labels:            map[string]string{"app": "prometheus", "component": "monitoring"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-45 * 24 * time.Hour)),
				},
				Secrets: []corev1.ObjectReference{
					{Name: "monitoring-sa-token-def"},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "deploy-service-account",
					Namespace:         "production",
					Labels:            map[string]string{"app": "deployment", "component": "ci-cd"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-60 * 24 * time.Hour)),
				},
				Secrets: []corev1.ObjectReference{
					{Name: "deploy-service-account-token-ghi"},
				},
			},
		},
	}, nil
}

func (m *mockClient) GetRoles(namespace string) (*rbacv1.RoleList, error) {
	return &rbacv1.RoleList{
		Items: []rbacv1.Role{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "pod-reader",
					Namespace:         "default",
					Labels:            map[string]string{"component": "rbac", "permission": "read"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-45 * 24 * time.Hour)),
				},
				Rules: []rbacv1.PolicyRule{
					{
						APIGroups: []string{""},
						Resources: []string{"pods"},
						Verbs:     []string{"get", "list", "watch"},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "config-manager",
					Namespace:         "default",
					Labels:            map[string]string{"component": "rbac", "permission": "manage"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
				},
				Rules: []rbacv1.PolicyRule{
					{
						APIGroups: []string{""},
						Resources: []string{"configmaps", "secrets"},
						Verbs:     []string{"get", "list", "create", "update", "patch"},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "service-editor",
					Namespace:         "production",
					Labels:            map[string]string{"component": "rbac", "permission": "edit"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-20 * 24 * time.Hour)),
				},
				Rules: []rbacv1.PolicyRule{
					{
						APIGroups: []string{""},
						Resources: []string{"services", "endpoints"},
						Verbs:     []string{"get", "list", "create", "update", "patch", "delete"},
					},
				},
			},
		},
	}, nil
}

func (m *mockClient) GetClusterRoles() (*rbacv1.ClusterRoleList, error) {
	return &rbacv1.ClusterRoleList{
		Items: []rbacv1.ClusterRole{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "cluster-admin",
					Labels:            map[string]string{"component": "rbac", "level": "cluster"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				Rules: []rbacv1.PolicyRule{
					{
						APIGroups: []string{"*"},
						Resources: []string{"*"},
						Verbs:     []string{"*"},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "monitoring-reader",
					Labels:            map[string]string{"component": "rbac", "app": "monitoring"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-45 * 24 * time.Hour)),
				},
				Rules: []rbacv1.PolicyRule{
					{
						APIGroups: []string{""},
						Resources: []string{"nodes", "nodes/metrics", "pods", "services", "endpoints"},
						Verbs:     []string{"get", "list", "watch"},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "network-policy-admin",
					Labels:            map[string]string{"component": "rbac", "app": "networking"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-60 * 24 * time.Hour)),
				},
				Rules: []rbacv1.PolicyRule{
					{
						APIGroups: []string{"networking.k8s.io"},
						Resources: []string{"networkpolicies"},
						Verbs:     []string{"get", "list", "create", "update", "patch", "delete"},
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "storage-admin",
					Labels:            map[string]string{"component": "rbac", "app": "storage"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-75 * 24 * time.Hour)),
				},
				Rules: []rbacv1.PolicyRule{
					{
						APIGroups: []string{""},
						Resources: []string{"persistentvolumes", "persistentvolumeclaims"},
						Verbs:     []string{"get", "list", "create", "update", "patch", "delete"},
					},
					{
						APIGroups: []string{"storage.k8s.io"},
						Resources: []string{"storageclasses"},
						Verbs:     []string{"get", "list", "create", "update", "patch", "delete"},
					},
				},
			},
		},
	}, nil
}

func (m *mockClient) GetRoleBindings(namespace string) (*rbacv1.RoleBindingList, error) {
	return &rbacv1.RoleBindingList{
		Items: []rbacv1.RoleBinding{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "read-pods",
					Namespace:         "default",
					Labels:            map[string]string{"component": "rbac", "type": "binding"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-45 * 24 * time.Hour)),
				},
				RoleRef: rbacv1.RoleRef{
					APIGroup: "rbac.authorization.k8s.io",
					Kind:     "Role",
					Name:     "pod-reader",
				},
				Subjects: []rbacv1.Subject{
					{
						Kind:      "ServiceAccount",
						Name:      "app-service-account",
						Namespace: "default",
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "manage-configs",
					Namespace:         "default",
					Labels:            map[string]string{"component": "rbac", "type": "binding"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
				},
				RoleRef: rbacv1.RoleRef{
					APIGroup: "rbac.authorization.k8s.io",
					Kind:     "Role",
					Name:     "config-manager",
				},
				Subjects: []rbacv1.Subject{
					{
						Kind:     "User",
						Name:     "admin@example.com",
						APIGroup: "rbac.authorization.k8s.io",
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "edit-services",
					Namespace:         "production",
					Labels:            map[string]string{"component": "rbac", "type": "binding"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-20 * 24 * time.Hour)),
				},
				RoleRef: rbacv1.RoleRef{
					APIGroup: "rbac.authorization.k8s.io",
					Kind:     "Role",
					Name:     "service-editor",
				},
				Subjects: []rbacv1.Subject{
					{
						Kind:      "ServiceAccount",
						Name:      "deploy-service-account",
						Namespace: "production",
					},
				},
			},
		},
	}, nil
}

func (m *mockClient) GetClusterRoleBindings() (*rbacv1.ClusterRoleBindingList, error) {
	return &rbacv1.ClusterRoleBindingList{
		Items: []rbacv1.ClusterRoleBinding{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "cluster-admin-binding",
					Labels:            map[string]string{"component": "rbac", "level": "cluster"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				RoleRef: rbacv1.RoleRef{
					APIGroup: "rbac.authorization.k8s.io",
					Kind:     "ClusterRole",
					Name:     "cluster-admin",
				},
				Subjects: []rbacv1.Subject{
					{
						Kind:     "User",
						Name:     "admin@example.com",
						APIGroup: "rbac.authorization.k8s.io",
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "monitoring-binding",
					Labels:            map[string]string{"component": "rbac", "app": "monitoring"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-45 * 24 * time.Hour)),
				},
				RoleRef: rbacv1.RoleRef{
					APIGroup: "rbac.authorization.k8s.io",
					Kind:     "ClusterRole",
					Name:     "monitoring-reader",
				},
				Subjects: []rbacv1.Subject{
					{
						Kind:      "ServiceAccount",
						Name:      "monitoring-sa",
						Namespace: "kube-system",
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "network-admin-binding",
					Labels:            map[string]string{"component": "rbac", "app": "networking"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-60 * 24 * time.Hour)),
				},
				RoleRef: rbacv1.RoleRef{
					APIGroup: "rbac.authorization.k8s.io",
					Kind:     "ClusterRole",
					Name:     "network-policy-admin",
				},
				Subjects: []rbacv1.Subject{
					{
						Kind:     "Group",
						Name:     "system:network-admins",
						APIGroup: "rbac.authorization.k8s.io",
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "storage-admin-binding",
					Labels:            map[string]string{"component": "rbac", "app": "storage"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-75 * 24 * time.Hour)),
				},
				RoleRef: rbacv1.RoleRef{
					APIGroup: "rbac.authorization.k8s.io",
					Kind:     "ClusterRole",
					Name:     "storage-admin",
				},
				Subjects: []rbacv1.Subject{
					{
						Kind:     "User",
						Name:     "storage-admin@example.com",
						APIGroup: "rbac.authorization.k8s.io",
					},
				},
			},
		},
	}, nil
}

// Mock Common
func (m *mockClient) GetNodes() (*corev1.NodeList, error) {
	return &corev1.NodeList{
		Items: []corev1.Node{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name: "node-1",
					Labels: map[string]string{
						"node-role.kubernetes.io/control-plane": "",
						"kubernetes.io/arch":                    "amd64",
						"kubernetes.io/os":                      "linux",
						"node.kubernetes.io/instance-type":      "m5.large",
					},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
				},
				Status: corev1.NodeStatus{
					Conditions: []corev1.NodeCondition{
						{Type: corev1.NodeReady, Status: corev1.ConditionTrue, Message: "kubelet is posting ready status"},
						{Type: corev1.NodeMemoryPressure, Status: corev1.ConditionFalse},
						{Type: corev1.NodeDiskPressure, Status: corev1.ConditionFalse},
						{Type: corev1.NodePIDPressure, Status: corev1.ConditionFalse},
					},
					NodeInfo: corev1.NodeSystemInfo{
						KubeletVersion:          "v1.28.0",
						KubeProxyVersion:        "v1.28.0",
						ContainerRuntimeVersion: "containerd://1.6.21",
						OperatingSystem:         "linux",
						Architecture:            "amd64",
					},
					Capacity: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("4"),
						corev1.ResourceMemory: resource.MustParse("16Gi"),
						corev1.ResourcePods:   resource.MustParse("110"),
					},
					Allocatable: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("3.5"),
						corev1.ResourceMemory: resource.MustParse("14Gi"),
						corev1.ResourcePods:   resource.MustParse("110"),
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name: "node-2",
					Labels: map[string]string{
						"node-role.kubernetes.io/worker":   "",
						"kubernetes.io/arch":               "amd64",
						"kubernetes.io/os":                 "linux",
						"node.kubernetes.io/instance-type": "m5.xlarge",
					},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
				},
				Status: corev1.NodeStatus{
					Conditions: []corev1.NodeCondition{
						{Type: corev1.NodeReady, Status: corev1.ConditionTrue, Message: "kubelet is posting ready status"},
						{Type: corev1.NodeMemoryPressure, Status: corev1.ConditionFalse},
						{Type: corev1.NodeDiskPressure, Status: corev1.ConditionFalse},
						{Type: corev1.NodePIDPressure, Status: corev1.ConditionFalse},
					},
					NodeInfo: corev1.NodeSystemInfo{
						KubeletVersion:          "v1.28.0",
						KubeProxyVersion:        "v1.28.0",
						ContainerRuntimeVersion: "containerd://1.6.21",
						OperatingSystem:         "linux",
						Architecture:            "amd64",
					},
					Capacity: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("8"),
						corev1.ResourceMemory: resource.MustParse("32Gi"),
						corev1.ResourcePods:   resource.MustParse("110"),
					},
					Allocatable: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("7.5"),
						corev1.ResourceMemory: resource.MustParse("30Gi"),
						corev1.ResourcePods:   resource.MustParse("110"),
					},
				},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name: "node-3",
					Labels: map[string]string{
						"node-role.kubernetes.io/worker":   "",
						"kubernetes.io/arch":               "amd64",
						"kubernetes.io/os":                 "linux",
						"node.kubernetes.io/instance-type": "m5.2xlarge",
					},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-25 * 24 * time.Hour)),
				},
				Status: corev1.NodeStatus{
					Conditions: []corev1.NodeCondition{
						{Type: corev1.NodeReady, Status: corev1.ConditionTrue, Message: "kubelet is posting ready status"},
						{Type: corev1.NodeMemoryPressure, Status: corev1.ConditionTrue, Message: "Node memory pressure detected"},
						{Type: corev1.NodeDiskPressure, Status: corev1.ConditionFalse},
						{Type: corev1.NodePIDPressure, Status: corev1.ConditionFalse},
					},
					NodeInfo: corev1.NodeSystemInfo{
						KubeletVersion:          "v1.28.0",
						KubeProxyVersion:        "v1.28.0",
						ContainerRuntimeVersion: "containerd://1.6.21",
						OperatingSystem:         "linux",
						Architecture:            "amd64",
					},
					Capacity: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("16"),
						corev1.ResourceMemory: resource.MustParse("64Gi"),
						corev1.ResourcePods:   resource.MustParse("110"),
					},
					Allocatable: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("15.5"),
						corev1.ResourceMemory: resource.MustParse("62Gi"),
						corev1.ResourcePods:   resource.MustParse("110"),
					},
				},
			},
		},
	}, nil
}

func (m *mockClient) GetNamespaces() (*corev1.NamespaceList, error) {
	return &corev1.NamespaceList{
		Items: []corev1.Namespace{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "default",
					Labels:            map[string]string{"name": "default"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				Status: corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "kube-system",
					Labels:            map[string]string{"name": "kube-system", "component": "system"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				Status: corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "kube-public",
					Labels:            map[string]string{"name": "kube-public", "component": "system"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				Status: corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "kube-node-lease",
					Labels:            map[string]string{"name": "kube-node-lease", "component": "system"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-90 * 24 * time.Hour)),
				},
				Status: corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "production",
					Labels:            map[string]string{"name": "production", "env": "prod"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-60 * 24 * time.Hour)),
				},
				Status: corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "staging",
					Labels:            map[string]string{"name": "staging", "env": "staging"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-45 * 24 * time.Hour)),
				},
				Status: corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "monitoring",
					Labels:            map[string]string{"name": "monitoring", "component": "observability"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-75 * 24 * time.Hour)),
				},
				Status: corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
			},
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "logging",
					Labels:            map[string]string{"name": "logging", "component": "observability"},
					CreationTimestamp: metav1.NewTime(time.Now().Add(-70 * 24 * time.Hour)),
				},
				Status: corev1.NamespaceStatus{Phase: corev1.NamespaceActive},
			},
		},
	}, nil
}

func (m *mockClient) GetEvents(namespace string) (*corev1.EventList, error) {
	events := []corev1.Event{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "nginx-deployment.17abc123",
				Namespace: "default",
			},
			InvolvedObject: corev1.ObjectReference{
				Kind:      "Pod",
				Name:      "nginx-deployment-7d8c6f8b9c-xyz12",
				Namespace: "default",
			},
			Type:           "Normal",
			Reason:         "Scheduled",
			Message:        "Successfully assigned default/nginx-deployment-7d8c6f8b9c-xyz12 to node-1",
			FirstTimestamp: metav1.NewTime(time.Now().Add(-48 * time.Hour)),
			LastTimestamp:  metav1.NewTime(time.Now().Add(-48 * time.Hour)),
			Count:          1,
			Source: corev1.EventSource{
				Component: "default-scheduler",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "redis-master.17abc456",
				Namespace: "default",
			},
			InvolvedObject: corev1.ObjectReference{
				Kind:      "Pod",
				Name:      "redis-master-78d9c4b5a-abc34",
				Namespace: "default",
			},
			Type:           "Warning",
			Reason:         "Failed",
			Message:        "Error: container redis exited with code 1",
			FirstTimestamp: metav1.NewTime(time.Now().Add(-1 * time.Hour)),
			LastTimestamp:  metav1.NewTime(time.Now().Add(-5 * time.Minute)),
			Count:          12,
			Source: corev1.EventSource{
				Component: "kubelet",
				Host:      "node-2",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "api-service.17abc789",
				Namespace: "default",
			},
			InvolvedObject: corev1.ObjectReference{
				Kind:      "Service",
				Name:      "api-service",
				Namespace: "default",
			},
			Type:           "Normal",
			Reason:         "Created",
			Message:        "Service created successfully",
			FirstTimestamp: metav1.NewTime(time.Now().Add(-14 * 24 * time.Hour)),
			LastTimestamp:  metav1.NewTime(time.Now().Add(-14 * 24 * time.Hour)),
			Count:          1,
			Source: corev1.EventSource{
				Component: "service-controller",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "data-claim.17def456",
				Namespace: "default",
			},
			InvolvedObject: corev1.ObjectReference{
				Kind:      "PersistentVolumeClaim",
				Name:      "data-claim",
				Namespace: "default",
			},
			Type:           "Normal",
			Reason:         "Bound",
			Message:        "Successfully bound to volume pv-data",
			FirstTimestamp: metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
			LastTimestamp:  metav1.NewTime(time.Now().Add(-30 * 24 * time.Hour)),
			Count:          1,
			Source: corev1.EventSource{
				Component: "persistentvolume-controller",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "frontend-app.17ghi789",
				Namespace: "production",
			},
			InvolvedObject: corev1.ObjectReference{
				Kind:      "Deployment",
				Name:      "frontend-app",
				Namespace: "production",
			},
			Type:           "Normal",
			Reason:         "ScalingReplicaSet",
			Message:        "Scaled up replica set frontend-app-6c9d8e7f to 5",
			FirstTimestamp: metav1.NewTime(time.Now().Add(-3 * time.Hour)),
			LastTimestamp:  metav1.NewTime(time.Now().Add(-3 * time.Hour)),
			Count:          1,
			Source: corev1.EventSource{
				Component: "deployment-controller",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "node-3.17jkl012",
				Namespace: "",
			},
			InvolvedObject: corev1.ObjectReference{
				Kind: "Node",
				Name: "node-3",
			},
			Type:           "Warning",
			Reason:         "MemoryPressure",
			Message:        "Node node-3 status is now: MemoryPressure",
			FirstTimestamp: metav1.NewTime(time.Now().Add(-2 * time.Hour)),
			LastTimestamp:  metav1.NewTime(time.Now().Add(-30 * time.Minute)),
			Count:          15,
			Source: corev1.EventSource{
				Component: "kubelet",
				Host:      "node-3",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "backup-job.17mno345",
				Namespace: "default",
			},
			InvolvedObject: corev1.ObjectReference{
				Kind:      "Job",
				Name:      "backup-job",
				Namespace: "default",
			},
			Type:           "Normal",
			Reason:         "Completed",
			Message:        "Job completed successfully",
			FirstTimestamp: metav1.NewTime(time.Now().Add(-1 * time.Hour)),
			LastTimestamp:  metav1.NewTime(time.Now().Add(-1 * time.Hour)),
			Count:          1,
			Source: corev1.EventSource{
				Component: "job-controller",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "monitoring-sa.17pqr678",
				Namespace: "kube-system",
			},
			InvolvedObject: corev1.ObjectReference{
				Kind:      "ServiceAccount",
				Name:      "monitoring-sa",
				Namespace: "kube-system",
			},
			Type:           "Normal",
			Reason:         "TokenRefresh",
			Message:        "Service account token refreshed",
			FirstTimestamp: metav1.NewTime(time.Now().Add(-6 * time.Hour)),
			LastTimestamp:  metav1.NewTime(time.Now().Add(-6 * time.Hour)),
			Count:          1,
			Source: corev1.EventSource{
				Component: "serviceaccount-controller",
			},
		},
	}

	// Filter events by namespace if specified
	if namespace != "" && namespace != "all" && namespace != "All Namespaces" {
		filtered := []corev1.Event{}
		for _, event := range events {
			if event.Namespace == namespace {
				filtered = append(filtered, event)
			}
		}
		events = filtered
	}

	return &corev1.EventList{Items: events}, nil
}

// Mock Pod Operations
func (m *mockClient) GetPodLogs(namespace, name, container string, lines int64) (string, error) {
	if name == "redis-master-78d9c4b5a-abc34" {
		return `1:C 07 Jun 2025 14:23:45.123 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
1:C 07 Jun 2025 14:23:45.123 # Redis version=6.2.6, bits=64, commit=00000000, modified=0, pid=1, just started
1:C 07 Jun 2025 14:23:45.123 # Configuration loaded
1:M 07 Jun 2025 14:23:45.124 * monotonic clock: POSIX clock_gettime
1:M 07 Jun 2025 14:23:45.125 # A key piece of configuration is missing
1:M 07 Jun 2025 14:23:45.125 # Fatal error, can't open config file '/etc/redis/redis.conf': No such file or directory`, nil
	}

	return fmt.Sprintf("Mock logs for pod %s in namespace %s\n", name, namespace) +
		"Application started successfully\n" +
		"Listening on port 8080\n" +
		"Ready to accept connections\n", nil
}

func (m *mockClient) StreamPodLogs(namespace, name, container string, lines int64, ws *websocket.Conn) error {
	// Mock streaming logs
	logs := []string{
		"Starting application...",
		"Loading configuration...",
		"Connecting to database...",
		"Server started on port 8080",
		"Ready to accept requests",
	}

	for _, log := range logs {
		if err := ws.WriteMessage(websocket.TextMessage, []byte(log+"\n")); err != nil {
			return err
		}
		time.Sleep(500 * time.Millisecond)
	}

	return nil
}

func (m *mockClient) ExecInPod(namespace, name, container string, command []string, ws *websocket.Conn) error {
	// Mock shell session
	ws.WriteMessage(websocket.TextMessage, []byte("Mock shell session for pod "+name+"\n"))
	ws.WriteMessage(websocket.TextMessage, []byte("# "))
	return nil
}

// Mock Resource Operations
func (m *mockClient) GetResource(resourceType, namespace, name string) (interface{}, error) {
	// Mock implementation - return a simple resource based on type
	switch resourceType {
	case "pod":
		return &corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      name,
				Namespace: namespace,
			},
			Spec: corev1.PodSpec{
				Containers: []corev1.Container{
					{Name: "app", Image: "nginx:latest"},
				},
			},
		}, nil
	case "deployment":
		return &appsv1.Deployment{
			ObjectMeta: metav1.ObjectMeta{
				Name:      name,
				Namespace: namespace,
			},
		}, nil
	default:
		return nil, fmt.Errorf("resource type %s not supported in mock", resourceType)
	}
}

func (m *mockClient) UpdateResource(resourceType, namespace, name, content string) error {
	// Mock implementation - just validate the input
	if resourceType == "" || name == "" || content == "" {
		return fmt.Errorf("invalid resource update parameters")
	}
	return nil
}
