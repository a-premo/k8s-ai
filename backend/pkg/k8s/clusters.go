package k8s

import (
	"fmt"
	"path/filepath"

	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/homedir"
)

type ClusterInfo struct {
	Name           string `json:"name"`
	Server         string `json:"server"`
	CurrentContext bool   `json:"current_context"`
	Status         string `json:"status"`
	Namespace      string `json:"namespace,omitempty"`
}

type KubeconfigManager struct {
	config *api.Config
}

func NewKubeconfigManager() (*KubeconfigManager, error) {
	kubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig: %v", err)
	}

	return &KubeconfigManager{config: config}, nil
}

func (km *KubeconfigManager) GetAvailableClusters() ([]ClusterInfo, error) {
	clusters := make([]ClusterInfo, 0)
	currentContext := km.config.CurrentContext

	for contextName, context := range km.config.Contexts {
		cluster, exists := km.config.Clusters[context.Cluster]
		if !exists {
			continue
		}

		clusterInfo := ClusterInfo{
			Name:           contextName,
			Server:         cluster.Server,
			CurrentContext: contextName == currentContext,
			Status:         "unknown", // Will be determined by health check
			Namespace:      context.Namespace,
		}

		clusters = append(clusters, clusterInfo)
	}

	return clusters, nil
}

func (km *KubeconfigManager) GetCurrentContext() string {
	return km.config.CurrentContext
}

func (km *KubeconfigManager) SwitchContext(contextName string) error {
	if _, exists := km.config.Contexts[contextName]; !exists {
		return fmt.Errorf("context %s does not exist", contextName)
	}

	km.config.CurrentContext = contextName

	// Save the config back to file
	kubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")
	return clientcmd.WriteToFile(*km.config, kubeconfig)
}
