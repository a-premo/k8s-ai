const express = require('express');
const { k8sClient } = require('../services/k8sClient');
const NodeCache = require('node-cache');

const router = express.Router();
const cache = new NodeCache({ stdTTL: 30 }); // 30 seconds cache

// Get all pods
router.get('/pods', async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    
    // Return mock data for now
    const mockPods = [
      {
        name: 'nginx-deployment-7d8c6f8b9c-xyz12',
        namespace: 'default',
        status: 'Running',
        ready: '1/1',
        restarts: 0,
        age: '2d',
        node: 'node-1',
        hasErrors: false
      },
      {
        name: 'redis-master-78d9c4b5a-abc34',
        namespace: 'cache',
        status: 'CrashLoopBackOff',
        ready: '0/1',
        restarts: 12,
        age: '1h',
        node: 'node-2',
        hasErrors: true
      }
    ];
    
    const filteredPods = namespace === 'all' ? mockPods : mockPods.filter(p => p.namespace === namespace);
    res.json(filteredPods);
  } catch (error) {
    console.error('Error fetching pods:', error);
    res.status(500).json({ error: 'Failed to fetch pods' });
  }
});

// Get all nodes
router.get('/nodes', async (req, res) => {
  try {
    const mockNodes = [
      {
        name: 'node-1-dev',
        status: 'Ready',
        version: 'v1.28.0',
        roles: 'control-plane',
        age: '30d'
      },
      {
        name: 'node-2-dev',
        status: 'Ready',
        version: 'v1.28.0',
        roles: 'worker',
        age: '30d'
      }
    ];
    
    res.json(mockNodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

// Get all deployments
router.get('/deployments', async (req, res) => {
  try {
    const mockDeployments = [
      {
        name: 'nginx-deployment',
        namespace: 'default',
        ready: '3/3',
        upToDate: 3,
        available: 3,
        age: '7d'
      }
    ];
    
    res.json(mockDeployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// Get namespaces
router.get('/namespaces', async (req, res) => {
  try {
    const mockNamespaces = ['All Namespaces', 'default', 'kube-system', 'cache'];
    res.json(mockNamespaces);
  } catch (error) {
    console.error('Error fetching namespaces:', error);
    res.status(500).json({ error: 'Failed to fetch namespaces' });
  }
});

module.exports = router;