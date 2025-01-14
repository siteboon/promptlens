# Contributing to PromptLens

We love your input! We want to make contributing to PromptLens as easy and transparent as possible.

## Table of Contents
## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Development Process

1. Fork the repo and create your branch from `main`
2. Name your branch based on the type of change:
   - Feature: `feature/description`
   - Bug fix: `fix/description`
   - Documentation: `docs/description`
   - Refactor: `refactor/description`
3. Write clear, concise commit messages
4. Include tests for new functionality
5. Update documentation as needed
6. Ensure all tests pass and there are no linting errors

## Pull Request Process

1. Update documentation
   - README.md for any interface changes
   - API.md for API changes
   - Update JSDoc comments for new functions/components
   - Add ADR for architectural decisions

2. Version Updates
   - Update version numbers in package.json 
   - Update CHANGELOG.md with your changes

3. Quality Checks
   - Run `npm run lint` to check for linting errors
   - Run `npm run typecheck` for type checking
   - Ensure no console errors or warnings

4. PR Requirements
   - Clear description of changes
   - Link to related issue(s)
   - Screenshots for UI changes
   - List of testing steps
   - Tag relevant reviewers

## Development Setup

1. Install Dependencies:
```bash
npm install
```

2. Set up environment:
```bash
cp .env.example .env
```

3. Start development servers:
```bash
npm run dev
```

4. Run tests:
```bash
npm run test
```

## Code Style

### TypeScript Guidelines

- Use TypeScript for all new code
- Define interfaces for props and state
- Use type inference where possible
- Avoid `any` type
- Use functional components with hooks

### React Best Practices

- Use functional components
- Keep components small and focused
- Use proper prop types
- Implement error boundaries
- Follow React hooks rules

### CSS/Styling

- Use Tailwind CSS classes
- Follow mobile-first approach
- Use DaisyUI components when possible
- Keep custom CSS minimal


## Testing

### Unit Tests

- Write tests for all new components
- Test both success and error cases
- Mock external dependencies
- Aim for high test coverage

### Integration Tests

- Test component interactions
- Test API integration
- Test form submissions
- Test error handling

### E2E Tests

- Test critical user flows
- Test across different browsers
- Test responsive design

## Documentation

### Code Documentation

- Use JSDoc comments for functions
- Document complex logic
- Include usage examples
- Document props and return types

### Architecture Documentation

- Write ADRs for significant decisions
- Document API changes
- Update component documentation
- Keep README up to date

## Bug Reports

When reporting bugs:

1. Use the bug report template
2. Include:
   - Quick summary
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots if applicable
   - Environment details
   - Possible solution (if you have one)

## Model Management

PromptLens supports multiple LLM models from different providers. Here's how to work with models in the project:

### Model Configuration

Models are configured in `server/src/config/models.ts`. This file contains:
- TypeScript interfaces for model configuration
- Default models included in the initial schema
- Helper functions for model management
- Documentation and examples

### Adding New Models

To add a new model to PromptLens:

1. Check `server/src/config/models.ts` for the current model configuration structure
2. Create a new migration file in `server/src/migrations/`
   - Use the example file `003_example_add_model.ts.example` as a template
   - Follow the version numbering pattern
   - Include both up and down migrations
3. Test your migration:
   ```bash
   # From the server directory
   npm run migrate:up   # Test the up migration
   npm run migrate:down # Test the down migration
   ```

### Model Requirements

When adding a new model, ensure you provide:
- Unique model ID matching the provider's naming
- Accurate cost information (per 1M tokens)
- Correct capability flags (vision, multilingual, etc.)
- Appropriate context window and token limits

### Best Practices

1. **Versioning**
   - Always create a new migration for model changes
   - Never modify the initial schema models directly
   - Keep migrations forward-only

2. **Documentation**
   - Comment any special model characteristics
   - Update relevant documentation
   - Include provider-specific notes

3. **Testing**
   - Test both up and down migrations
   - Verify model appears in UI correctly
   - Check model can be used for comparisons

4. **Cost Management**
   - Use consistent units (per 1M tokens)
   - Keep costs up-to-date with provider pricing
   - Document any special pricing conditions

## License

By contributing, you agree that your contributions will be licensed under the MIT License. 