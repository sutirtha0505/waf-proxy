package proxy

import (
	"path"
	"strings"
)

type StaticDetector struct {
	extensions map[string]struct{}
}

func NewStaticDetector(exts []string) *StaticDetector {
	set := make(map[string]struct{}, len(exts))
	for _, ext := range exts {
		set[strings.ToLower(ext)] = struct{}{}
	}
	return &StaticDetector{extensions: set}
}

func (d *StaticDetector) IsStatic(rawPath string) bool {
	ext := strings.ToLower(path.Ext(rawPath))
	_, ok := d.extensions[ext]
	return ok
}
