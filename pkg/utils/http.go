package utils

import (
	"bytes"
	"io"
	"net/http"
)

func CloneRequest(r *http.Request) *http.Request {
	return r.Clone(r.Context())
}

func BufferBody(r *http.Request, limit int64) (*bytes.Buffer, error) {
	if r.Body == nil {
		return bytes.NewBuffer(nil), nil
	}
	defer r.Body.Close()

	var buf bytes.Buffer
	reader := io.LimitReader(r.Body, limit+1)
	if _, err := io.Copy(&buf, reader); err != nil {
		return nil, err
	}

	r.Body = io.NopCloser(bytes.NewReader(buf.Bytes()))
	return &buf, nil
}

func CopyHeaders(src, dst http.Header) {
	for key, values := range src {
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}
