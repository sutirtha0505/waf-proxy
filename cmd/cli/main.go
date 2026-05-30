package main

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"time"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}
	switch os.Args[1] {
	case "start":
		cmd := exec.Command("./bin/waf")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Stdin = os.Stdin
		if err := cmd.Run(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	case "setup":
		cmd := exec.Command("./bin/setup")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Stdin = os.Stdin
		if err := cmd.Run(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	case "status":
		checkStatus("proxy", "http://localhost:8080")
		checkStatus("dashboard", "http://localhost:9090/login")
	case "stop":
		fmt.Println("stop: send SIGTERM to the running waf process")
	default:
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Println("usage: smart-waf <start|stop|status|setup>")
}

func checkStatus(name, url string) {
	client := http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		fmt.Printf("%s: down (%v)\n", name, err)
		return
	}
	defer resp.Body.Close()
	fmt.Printf("%s: up (%s)\n", name, resp.Status)
}
