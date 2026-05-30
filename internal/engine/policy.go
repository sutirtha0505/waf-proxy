package engine

type Action string

const (
	ActionAllow Action = "allow"
	ActionBlock Action = "block"
	ActionLog   Action = "log"
)

type Policy struct {
	Threshold float64
	Actions   map[string]Action
}

func NewPolicy(threshold float64) Policy {
	return Policy{
		Threshold: threshold,
		Actions: map[string]Action{
			"default": ActionBlock,
			"normal":  ActionAllow,
			"safe":    ActionAllow,
		},
	}
}

func (p Policy) ActionFor(vector string) Action {
	if action, ok := p.Actions[vector]; ok {
		return action
	}
	return p.Actions["default"]
}
