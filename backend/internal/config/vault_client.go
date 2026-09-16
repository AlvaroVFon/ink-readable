// Package config
package config

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

const (
	defaultTimeout = 5 * time.Second
	secretsURL     = "/secrets/consumer"
	apikeHeader    = "x-apikey"
)

var (
	ErrEmptyArgument       = errors.New("invalid empty argument")
	ErrCreatingHTTPRequest = errors.New("http creation fail")
	ErrorInvalidURL        = errors.New("invalid url provided")
)

type VaultClient struct {
	BaseURL string
	Apikey  string
	Client  *http.Client
}

type Secret struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type VaultResponse struct {
	Status  int      `json:"status"`
	Message string   `json:"message"`
	Data    []Secret `json:"data,omitempty"`
}

func NewVaultClient(baseURL, apikey string) (*VaultClient, error) {
	if baseURL == "" {
		return nil, fmt.Errorf("%w: %q", ErrEmptyArgument, "baseURL")
	}
	if _, err := url.Parse(baseURL); err != nil {
		return nil, fmt.Errorf("%w: %q", ErrorInvalidURL, baseURL)
	}
	if apikey == "" {
		return nil, fmt.Errorf("%w: %q", ErrEmptyArgument, "apikey")
	}

	client := http.Client{
		Timeout: defaultTimeout,
	}

	return &VaultClient{
		BaseURL: baseURL,
		Apikey:  apikey,
		Client:  &client,
	}, nil
}

func (c *VaultClient) GetSecrets(ctx context.Context) (map[string]string, error) {
	ctx, cancel := context.WithTimeout(ctx, c.Client.Timeout)
	defer cancel()

	fullURL := fmt.Sprintf("%s%s", c.BaseURL, secretsURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrCreatingHTTPRequest, err.Error())
	}

	// Setting headers
	req.Header.Set(apikeHeader, c.Apikey)
	req.Header.Set("Accept", "application/json")

	res, err := c.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var resp VaultResponse
	if err := json.NewDecoder(res.Body).Decode(&resp); err != nil {
		return nil, err
	}

	result := make(map[string]string, 0)
	for _, s := range resp.Data {
		result[s.Key] = s.Value
	}

	return result, nil
}
