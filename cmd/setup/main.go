package main

import (
	"fmt"
	"log"

	"smart-waf/internal/config"
	"smart-waf/internal/storage"
	"smart-waf/internal/tui"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	repo, err := storage.Open(cfg.DB.Path)
	if err != nil {
		log.Fatal(err)
	}
	if err := tui.NewWizard(repo, cfg).Run(); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Smart WAF setup complete")
	fmt.Println("Config: configs/waf.yaml")
	fmt.Println("Dataset CSV: logs/dataset.csv")
}
