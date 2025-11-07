# AI Alignment Studio

An interactive platform for exploring AI alignment challenges through ethical scenario testing. Compare how different AI models (GPT, Claude, Gemini, Ollama) respond to ethical dilemmas where values conflict.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-19.1.1-61dafb.svg)

## What is this?

This tool helps you understand one of AI's hardest problems: getting AI systems to behave ethically and align with human values. You'll test AI models with scenarios where multiple values conflict (privacy vs security, honesty vs harm prevention) and see how different models reason through these dilemmas.

The platform includes 15+ pre-built scenarios and lets you create your own. You can test multiple models side-by-side, analyze their reasoning, and export detailed reports of your experiments.

## What you need

- Node.js 18 or higher
- At least one AI API key, or Ollama installed locally
- A modern web browser

## Getting started

Clone the repository and install dependencies:

```bash
git clone https://github.com/Mapika/AlignmentStudio.git
cd AlignmentStudio
npm install
```

Start the development server:

```bash
npm run dev
```

The terminal will show a URL (usually http://localhost:5173). Open it in your browser.

## Getting API keys

You need at least one API key to test cloud-based models. The free tiers work fine for this project.

**Google Gemini** (recommended, has a generous free tier)  
Go to [Google AI Studio](https://makersuite.google.com/app/apikey), sign in, and create an API key. Keys start with `AIza...` and give you 60 requests per minute on the free tier.

**OpenAI GPT**  
Go to [OpenAI Platform](https://platform.openai.com/api-keys), create an account, and generate a new key. Keys start with `sk-...` and cost about $0.01-0.03 per test with GPT-4.

**Anthropic Claude**  
Go to [Anthropic Console](https://console.anthropic.com/), create an account, and generate a key. Keys start with `sk-ant-...` and cost about $0.01-0.04 per test.

**Ollama** (free, runs locally)  
Install [Ollama](https://ollama.ai/download) and download a model:

```bash
ollama pull qwen3:4b
```

Ollama runs on `http://localhost:11434/v1` by default and needs no API key. It's free and works offline, but generation can be slow without a GPU. For machines without GPU access, stick to models with 4 billion parameters or fewer. Good options: Qwen3 (0.6b-235b), GPT-OSS (20b-120b), or Gemma3 (270m-27b).

Note that smaller models (like gemma3:270m) might not understand the tasks and produce nonsense.

## Setting up API keys

Open the app in your browser, click the settings icon (gear in top right), enter your API keys, and save. Keys are stored in your browser's local storage and only sent to the official AI provider APIs.

## Using the platform

### Testing pre-built scenarios

The dashboard shows 15+ scenarios like "The Whistleblower's Dilemma" and "Emergency Coordinator Dilemma." Click one to open it.

The Setup tab shows the system prompts (instructions given to the AI) and information items (context for the scenario). The Test Runner tab is where you run experiments.

Select models for Panel A and Panel B. You can test the same model twice or compare different models. Click "Start Test" to run the scenario.

If both models receive identical prompts. Compare their responses, review the structured analysis (decision, framework, tradeoffs), and use the chat interface to ask follow-up questions.

### Creating custom scenarios

Click "Create New Scenario" on the dashboard. Give it a name and write System Prompt A, which defines the AI's role and directives (for example: "You are a medical AI. Your primary directive is patient wellbeing...").

System Prompt B is optional. Use it to test how different instructions affect behavior.

Add Information Items (emails, files, alerts, etc.) to provide context for the ethical dilemma. Save and test your scenario in the Test Runner.

### Comparing models

The side-by-side comparison lets you send identical prompts to two models and observe different approaches to the same dilemma. Try pairing models from different companies (Openai vs Antropic), testing the same model with different system prompts, or comparing large and small models.

## Project structure

```
AligmentHWFinal/
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── services/         # AI provider integrations
│   │   ├── hooks/            # React hooks
│   │   ├── utils/            # Helper functions
│   │   └── types/            # TypeScript definitions
│   ├── public/
│   │   └── scenarios.yaml    # Pre-built scenarios
│   └── package.json
└── test/
    ├── ASSIGNMENT.md         # Assignment guidelines
    └── scenarios.yaml        # Source scenarios
```

## Common issues

**API key errors**  
Double-check your key (no spaces, complete key copied). Verify the API provider is working and your account has appropriate permissions. Some providers require a payment method on file.

**Ollama connection failed**  
Make sure Ollama is running (`ollama list` should work). Verify the URL is `http://localhost:11434/v1`. Pull a model if you haven't (`ollama pull qwen3:4b`).

**Build errors**  
Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

**Slow responses**  
Use faster models (Gemini 2.5 Flash, GPT-5 mini). Check your internet connection. Try Ollama for local processing.

## Designing good scenarios

Present genuine ethical dilemmas with no clear right answer. Include conflicting values or goals, provide realistic context through information items, and make consequences meaningful. Test specific alignment concerns like deception or self-preservation.

Avoid scenarios with obvious correct answers, unrealistic situations, or insufficient context.

## Technical details

Built with React 19.1.1, TypeScript, Vite, and TailwindCSS. Supports Anthropic Claude, OpenAI GPT, Google Gemini, and Ollama models.

Your API keys are stored locally in your browser and never leave except to call official APIs. Custom scenarios are saved in browser local storage. No data is collected or tracked remotely.

## Resources

For background on AI alignment, read Stuart Russell's *Human Compatible* or Brian Christian's *The Alignment Problem*. The research from Anthropic, OpenAI, and DeepMind provides technical depth.

Common ethical frameworks you'll encounter: utilitarianism (greatest good for greatest number), deontology (duty-based universal rules), virtue ethics (character-based decisions), and care ethics (relationships and context).
