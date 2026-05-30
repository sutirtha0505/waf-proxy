package logging

import (
	"log"
	"os"
)

func New() *log.Logger {
	return log.New(os.Stdout, "smart-waf ", log.LstdFlags|log.LUTC|log.Lshortfile)
}
