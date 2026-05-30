package admin

import "smart-waf/pkg/models"

func DefaultAttackVectors() map[string]int {
	out := make(map[string]int, len(models.AttackVectors))
	for k, v := range models.AttackVectors {
		out[k] = v
	}
	return out
}

func NextAvailableCode(vectors map[string]int) int {
	return models.NextAvailableCode(vectors)
}
