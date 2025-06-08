# LibaryCard Documentation

This directory contains comprehensive documentation for the LibaryCard project, organized into focused subdirectories.

## Documentation Structure

### 📚 [Guides](./guides/) - User & Feature Documentation
- **[Getting Started](./guides/getting-started.md)** - Quick start guide for new users
- **[User Guide](./guides/user-guide.md)** - Complete user manual for LibaryCard features  
- **[Bookshelf Photo Scanning](./guides/bookshelf-photo-scanning-plan.md)** - OCR feature implementation guide

### 🛠️ [Development](./development/) - Technical Documentation
- **[Architecture Overview](./development/architecture.md)** - System design and technology stack
- **[Local Development](./development/local-development.md)** - Development environment setup
- **[API Reference](./development/api-reference.md)** - Complete API documentation
- **[Database Schema](./development/database-schema.md)** - Data model and relationships
- **[Troubleshooting](./development/troubleshooting.md)** - Common development issues and solutions

### 🚀 [Deployment](./deployment/) - Infrastructure & Setup
- **[Netlify Deployment](./deployment/netlify-deployment.md)** - Frontend deployment guide
- **[Cloudflare Setup](./deployment/cloudflare-setup.md)** - Workers and D1 configuration
- **[Email Verification Setup](./deployment/email-verification-setup.md)** - Email system configuration

### 📋 [Reference](./reference/) - Project Tracking
- **[Active TODOs](./reference/TODO.md)** - Current development priorities and upcoming features
- **[Change History](./reference/CHANGELOG.md)** - Complete history of implemented features

## Quick Start Paths

### 👤 **For New Users**
1. [Getting Started](./guides/getting-started.md) - Set up your first library
2. [User Guide](./guides/user-guide.md) - Learn all features
3. [Troubleshooting](./development/troubleshooting.md) - If you run into issues

### 👩‍💻 **For Developers**
1. [Architecture Overview](./development/architecture.md) - Understand the system
2. [Local Development](./development/local-development.md) - Set up your environment
3. [API Reference](./development/api-reference.md) - Work with the API
4. [Database Schema](./development/database-schema.md) - Understand the data model

### 🚀 **For Deployment**
1. [Cloudflare Setup](./deployment/cloudflare-setup.md) - Configure Workers and D1
2. [Email Setup](./deployment/email-verification-setup.md) - Configure email system
3. [Netlify Deployment](./deployment/netlify-deployment.md) - Deploy frontend

### 📊 **For Project Management**
1. [Active TODOs](./reference/TODO.md) - Current development priorities
2. [Change History](./reference/CHANGELOG.md) - Complete implementation history

## Documentation Organization Philosophy

This documentation is structured to support different audiences and use cases:

- **guides/** - Task-oriented documentation for end users and feature guides
- **development/** - Technical documentation for developers and maintainers
- **deployment/** - Infrastructure and configuration documentation
- **reference/** - Project tracking and historical information

## Contributing to Documentation

When updating documentation:

1. **Choose the right directory** based on your audience and content type
2. **Keep user-focused docs simple** and task-oriented in `guides/`
3. **Include technical details and code examples** in `development/`
4. **Document infrastructure changes** in `deployment/`
5. **Update cross-references** when moving or renaming files
6. **Test all code examples** and commands before committing

## Documentation Standards

- Use clear, descriptive headings with consistent hierarchy
- Include practical examples and code snippets where helpful
- Keep language accessible to the intended audience
- Update regularly as features and architecture evolve
- Maintain consistent formatting and style across all documents
- Cross-reference related documentation appropriately