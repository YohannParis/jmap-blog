.PHONY: generate clean deps help check-deps

# Default target
all: generate

# Check if dependencies are installed
check-deps:
	@echo "Checking dependencies..."
	@if [ ! -d "node_modules/fs-extra" ]; then \
		echo "fs-extra not found, installing dependencies..."; \
		npm install fs-extra; \
	else \
		echo "Dependencies are already installed."; \
	fi

# Generate the blog
generate: check-deps
	@echo "Generating blog..."
	node blog-generator.js

# Clean the build directory
clean:
	@echo "Cleaning build directory..."
	rm -rf build
	rm -rf temp

# Install dependencies
deps:
	@echo "Installing dependencies..."
	npm install fs-extra

# Regenerate (clean and generate)
regenerate: clean generate

# Help information
help:
	@echo "Blog Generator Makefile Commands:"
	@echo "  make           - Generate the blog (checks dependencies first)"
	@echo "  make generate  - Generate the blog (same as default)"
	@echo "  make clean     - Remove generated files"
	@echo "  make deps      - Install dependencies"
	@echo "  make regenerate- Clean and regenerate"
	@echo "  make help      - Show this help message"

# Default target is generate
default: generate