# AI Alignment Studio

An interactive educational platform for exploring AI alignment challenges through ethical scenario testing. Students can compare how different AI models (GPT, Claude, Gemini, Ollama) respond to complex ethical dilemmas where multiple values conflict.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-19.1.1-61dafb.svg)

---

## Overview

**AI Alignment Studio** helps students understand one of AI's most critical challenges: ensuring AI systems behave ethically and align with human values. Through hands-on experimentation with pre-built and custom scenarios, you'll explore:

- How different AI models make ethical decisions
- What happens when values conflict (privacy vs. security, rules vs. outcomes)
- How small changes in AI instructions affect behavior
- Real-world challenges in AI safety and alignment

### What is AI Alignment?

AI alignment ensures artificial intelligence systems pursue goals consistent with human values and intentions. This becomes challenging when:
- Multiple values conflict (e.g., honesty vs. harm prevention)
- Short-term and long-term goals differ
- AI systems develop instrumental goals that may conflict with their stated purpose
- Edge cases reveal hidden assumptions in training

---

## Features

- **15+ Pre-built Scenarios**: Professionally designed ethical dilemmas covering key alignment challenges
- **Custom Scenario Builder**: Create your own alignment tests with system prompts and information items
- **Multi-Model Testing**: Compare responses from GPT, Claude, Gemini, and Ollama
- **Side-by-Side Comparison**: Test two models simultaneously with identical scenarios
- **Structured Analysis**: Extract ethical frameworks, reasoning, and tradeoffs from responses
- **Interactive Chat**: Follow-up with AI models to probe their reasoning
- **Export Capabilities**: Generate detailed Markdown or JSON reports of experiments
- **Student Notes**: Document observations during testing
- **Local Storage**: Automatically saves custom scenarios

---

## Quick Start

### Prerequisites

- **[Node.js 18+](https://nodejs.org/en/download/current)** (check with `node --version`)
- **npm** (included with Node.js)
- **At least one AI API key** or [Ollama](https://ollama.com/download/windows) (see [Getting API Keys](#getting-api-keys) below)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mapika/AlignmentStudio.git
   cd AligmentStudio
   ```
   
2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - The terminal will show a URL (typically http://localhost:5173)
   - Open this URL in your browser

---

## Getting API Keys

You need at least one API key to use the application (or Ollama). Free tier keys are sufficient for this assignment.

### Option 1: Google Gemini (Recommended - Free)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your key (starts with `AIza...`)

**Free Tier**: 60 requests per minute

### Option 2: OpenAI GPT

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or sign in
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy your key (starts with `sk-...`)

**Cost**: Pay as you go (~$0.01-0.03 per test with GPT-4)

### Option 3: Anthropic Claude

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or sign in
3. Navigate to API Keys
4. Create a new key
5. Copy your key (starts with `sk-ant-...`)

**Cost**: Pay as you go (~$0.01-0.04 per test with Claude)

### Option 4: Ollama (Local - Free)

1. Install [Ollama](https://ollama.ai/download)
2. Download your preferred:
   ```bash
   ollama pull qwen3:4b
   # or
   ollama pull gemma3:1b
   # etc.
   ```
3. Ollama runs on `http://localhost:11434/v1` by default
4. No API key needed!

**Benefits**: Free, private, works offline. You can use the ollama chat app to download the models. (We recommend also testing them out, to see generation speed). The models are computation heavy, for those without access to a GPU we recommend running at most 4 billion parameters models. The best freely available model families are [Qwen3 from Alibaba](https://ollama.com/library/qwen3), with model ranging from 0.6b to 235b parameteres. A close second are the [opensource GPT models from OpenAI](https://ollama.com/library/gpt-oss), this model is available in a 20b and a 120b variant. Finally, the [gemma3 models from Google](https://ollama.com/library/gemma3) are a good alternative choice, with parameter counts from 270m to 27b. You can feel free to test other models :)

---

## Configuration

### Setting Up API Keys

1. **Open the application** in your browser
2. **Click the Settings icon** (gear icon in top right)
3. **Enter your API key(s)** in the corresponding fields:
   - Gemini API Key
   - OpenAI API Key
   - Anthropic API Key
   - Ollama URL (default: http://localhost:11434/v1)
4. **Click "Save Settings"**

Your API keys are stored securely in your browser's local storage and never sent to any server except the official AI provider APIs.

---

## Usage Guide

### 1. Exploring Pre-built Scenarios

1. **From the Dashboard**, select a scenario from the list:
   - The Whistleblower's Dilemma
   - The AWS Engagement Protocol
   - Emergency Coordinator Dilemma
   - ...and 12 more

2. **Click on a scenario** to open it

3. **Review the Setup tab**:
   - Read the system prompts (instructions given to the AI)
   - Review the information items (context for the scenario)
   - See the ethical dilemma presented

4. **Switch to Test Runner tab**

5. **Select AI models**:
   - Choose provider and model for Panel A (left)
   - Choose provider and model for Panel B (right)
   - You can test the same model twice or compare different models

6. **Click "Start Test"** to run the scenario

7. **Analyze responses**:
   - Read both models' responses
   - Compare their ethical reasoning
   - Review the structured analysis (decision, framework, tradeoffs)

8. **Continue the conversation**:
   - Type follow-up questions in the input box
   - Challenge their reasoning
   - Explore alternative perspectives

9. **Take notes**:
   - Click "Notes" button to open the notes panel
   - Document your observations for later analysis

10. **Export results**:
    - Click "Export MD" for a formatted Markdown report
    - Click "Export JSON" to save the raw data

### 2. Creating Custom Scenarios

1. **Click "Create New Scenario"** on the dashboard

2. **Give your scenario a name**

3. **Write System Prompt A**:
   - Define the AI's role and core directives
   - Example: "You are a medical AI. Your primary directive is patient wellbeing..."

4. **Write System Prompt B** (optional):
   - Create a variation to test how different instructions affect behavior
   - Example: Same role but with emphasis on "transparency over privacy"

5. **Add Information Items**:
   - Click "Add Information Item"
   - Choose type: Email, File, Alert, Internal Memo, etc.
   - Add title and content
   - These provide context for the ethical dilemma

6. **Save and test** your scenario in the Test Runner

### 3. Comparing Models

The side-by-side comparison lets you:
- Send identical prompts to two different models
- Observe different approaches to the same ethical dilemma
- Identify patterns in decision-making
- Document differences in ethical frameworks

**Pro tip**: Try pairing:
- GPT-4 vs. Claude (different companies' approaches)
- Same model with different system prompts (Prompt A vs. B)
- Large model vs. small model (GPT-4 vs. GPT-3.5)

---

## Assignment Workflow

### For Students Completing the Assignment

1. **Setup** (10 minutes)
   - Install dependencies
   - Get at least one API key/Ollama
   - Configure settings in the app

2. **Part 1: Explore Pre-built Scenarios**
   - Test at least 5 scenarios
   - Use at least 2 different AI models per scenario
   - Take notes on differences and patterns
   - Export results for reference

3. **Part 2: Create Custom Scenarios**
   - Design at least 2 original scenarios
   - Focus on genuine ethical dilemmas
   - Test with multiple models
   - Document the alignment challenges revealed

4. **Part 3: Analysis**
   - Review exported experiments
   - Analyze patterns across models
   - Write reflection paper addressing:
     - Model comparison
     - Ethical frameworks observed
     - Alignment challenges identified
     - Personal insights
     - Recommendations for AI developers

---

## Project Structure

```
AligmentHWFinal/
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── chat/        # Chat interface
│   │   │   ├── layout/      # Navigation, dashboard
│   │   │   ├── scenario/    # Scenario editor
│   │   │   └── settings/    # Settings panel
│   │   ├── services/        # AI provider integrations
│   │   │   └── ai/          # API calls to AI models
│   │   ├── hooks/           # React hooks
│   │   ├── utils/           # Helper functions
│   │   ├── types/           # TypeScript definitions
│   │   ├── config/          # Model configurations
│   │   └── App.tsx          # Main application
│   ├── public/
│   │   └── scenarios.yaml   # Pre-built scenarios
│   └── package.json
├── test/                     # Original scenarios and docs
│   ├── ASSIGNMENT.md        # Detailed assignment guidelines
│   ├── scenarios.yaml       # Source scenarios file
│   └── README.md            # Additional documentation
└── README.md                # This file
```

---

## Troubleshooting

### Scenarios Not Loading

**Problem**: Dashboard shows no pre-built scenarios

**Solution**:
```bash
# From the frontend directory
cp ../test/scenarios.yaml public/scenarios.yaml
```

Then refresh your browser.

### API Key Errors

**Problem**: "Invalid API key" or authentication errors

**Solutions**:
- **Double-check your key**: No extra spaces, complete key copied
- **Check API provider status**: Visit their status page
- **Verify billing**: Some providers require payment method on file
- **Key permissions**: Ensure key has appropriate permissions

### Ollama Connection Failed

**Problem**: Cannot connect to Ollama

**Solutions**:
- **Check Ollama is running**: `ollama list` should work
- **Verify URL**: Should be `http://localhost:11434/v1`
- **Pull a model**: `ollama pull llama2`
- **Check port**: Ensure nothing else is using port 11434

### Build Errors

**Problem**: TypeScript or build errors

**Solutions**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Slow Response Times

**Problem**: AI responses take too long

**Solutions**:
- **Use faster models**: Gemini Flash, GPT-3.5 Turbo, Claude Instant
- **Check internet connection**: API calls require good connection
- **Try Ollama**: Run models locally for faster responses
- **Reduce complexity**: Shorter prompts = faster responses

---

## Tips for Success

### Designing Effective Scenarios

✅ **Do:**
- Present genuine ethical dilemmas with no clear right answer
- Include conflicting values or goals
- Provide realistic context through information items
- Make consequences meaningful and clear
- Test specific alignment concerns (deception, self-preservation, etc.)

❌ **Don't:**
- Create scenarios with obvious correct answers
- Make situations too unrealistic or fantastical
- Provide insufficient context
- Ignore edge cases and incentives

### Testing Systematically

1. **Document everything**: Take notes immediately
2. **Test consistently**: Same scenario, multiple models
3. **Ask follow-ups**: Use chat to probe deeper
4. **Look for patterns**: Do models consistently use certain frameworks?
5. **Check consistency**: Does reasoning match the decision?

### Writing Your Analysis

- **Be specific**: Reference concrete examples from experiments
- **Think critically**: Don't just describe—analyze why it matters
- **Make connections**: Relate to class concepts and readings
- **Be honest**: Uncertainty is valuable
- **Think big picture**: Consider real-world implications

---

## Technical Details

### Built With

- **React 19.1.1** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Marked.js** - Markdown rendering
- **js-yaml** - YAML parsing

### AI Providers Supported

- **Anthropic Claude** (Claude 3.5 Sonnet, Claude 3 Opus, etc.)
- **OpenAI GPT** (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
- **Google Gemini** (Gemini 1.5 Pro, Gemini 1.5 Flash)
- **Ollama** (Local models: Llama 2, Mistral, etc.)

### Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Requires modern browser with ES6 support and local storage.

---

## Privacy & Security

- **API keys stored locally**: Keys never leave your browser except to call official APIs
- **No data collection**: Your experiments are not tracked or stored remotely
- **Local scenarios**: Custom scenarios saved in browser local storage
- **Open source**: Audit the code yourself

---

## Common Questions

**Q: Do I need to pay for API keys?**
A: Gemini offers a generous free tier. OpenAI and Anthropic require payment but cost ~$0.01-0.04 per test. Ollama is completely free.

**Q: Can I use the app offline?**
A: Yes, if you use Ollama. Other providers require internet for API calls.

**Q: How many scenarios should I test?**
A: Minimum 5 pre-built scenarios for the assignment. More is better for comprehensive analysis.

**Q: Can I edit pre-built scenarios?**
A: Yes! You can duplicate and modify any scenario in the Setup tab.

**Q: How do I share my experiments?**
A: Use the Export buttons to generate Markdown or JSON files you can submit or share.

**Q: What if a model gives an error?**
A: Check your API key, verify billing, and try again. Some models have rate limits.

---

## Contributing

This is an educational project. If you find bugs or have suggestions:

1. Document the issue clearly
2. Check if it's already reported
3. Provide steps to reproduce
4. Include screenshots if applicable

---

## License

MIT License - see LICENSE file for details

---

## Resources

### AI Alignment Background
- Stuart Russell's *Human Compatible* - Foundational text
- Brian Christian's *The Alignment Problem* - Accessible overview
- Research from Anthropic, OpenAI, DeepMind

### Ethical Frameworks
- **Utilitarianism**: Greatest good for greatest number
- **Deontology**: Duty-based, universal rules
- **Virtue Ethics**: Character-based decision making
- **Care Ethics**: Relationships and context

### Thought Experiments
- The Trolley Problem
- The Experience Machine
- The Veil of Ignorance
- Asimov's Laws of Robotics

---

## Acknowledgments

Built as an educational tool for exploring AI alignment challenges in the classroom. Special thanks to the AI safety research community for inspiring these scenarios.

---

## Support

For technical issues or questions:
- Check this README's [Troubleshooting](#troubleshooting) section
- Review the [Assignment Guidelines](test/ASSIGNMENT.md)
- Consult course materials
- Ask during office hours

---

**Happy exploring! Remember: There are no perfect answers in AI alignment—approach with curiosity and intellectual honesty.** 🤖✨
