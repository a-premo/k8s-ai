package cache

import (
	"time"

	"github.com/patrickmn/go-cache"
)

type Service interface {
	Get(key string) (interface{}, bool)
	Set(key string, value interface{})
	Delete(key string)
	Clear()
}

type service struct {
	cache *cache.Cache
}

func NewService(defaultTTL time.Duration) Service {
	return &service{
		cache: cache.New(defaultTTL, defaultTTL*2),
	}
}

func (s *service) Get(key string) (interface{}, bool) {
	return s.cache.Get(key)
}

func (s *service) Set(key string, value interface{}) {
	s.cache.Set(key, value, cache.DefaultExpiration)
}

func (s *service) Delete(key string) {
	s.cache.Delete(key)
}

func (s *service) Clear() {
	s.cache.Flush()
}
