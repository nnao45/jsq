import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZardCardComponent } from '@shared/components/card/card.component';
import { ZardButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-repl',
  standalone: true,
  imports: [CommonModule, ZardCardComponent, ZardButtonComponent],
  template: `
    <div class="container mx-auto px-6">
      <div class="text-center mb-12">
        <h1 class="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent animate-gradient-x">
          Interactive REPL Mode
        </h1>
        <p class="text-xl text-muted-foreground max-w-3xl mx-auto">
          Experience the revolutionary way to explore and manipulate JSON data in real-time
        </p>
      </div>

      <div class="mb-12">
        <z-card>
          <div class="p-8">
            <h2 class="text-3xl font-bold mb-6 text-primary">🎯 The Game Changer</h2>
            <div class="space-y-4 text-lg">
              <p class="text-foreground">
                What makes jsq's REPL mode revolutionary is its <span class="font-bold text-primary">seamless pipe integration</span>. 
                Unlike traditional REPLs, jsq can receive JSON data through pipes and immediately provide an interactive environment to explore and transform it.
              </p>
              <div class="bg-accent/10 border-l-4 border-primary p-4 rounded-r-lg">
                <p class="font-semibold">
                  💡 Pipe any JSON data directly into an interactive REPL session - no intermediate files needed!
                </p>
              </div>
            </div>
          </div>
        </z-card>
      </div>

      <div class="gap-8 mb-12">
        <z-card>
          <div class="p-8">
            <h2 class="text-2xl font-bold mb-6">🚀 Launch Methods</h2>
            
            <div class="space-y-8">
              <div>
                <h3 class="text-xl font-semibold mb-3 text-primary">1. Direct Pipe Integration (Revolutionary!)</h3>
                <p class="mb-4 text-muted-foreground">
                  Pipe JSON data from any source directly into the REPL for immediate interactive exploration:
                </p>
                <div class="space-y-4">
                  <pre class="bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto"><code>{{ code }}</code></pre>
                </div>
              </div>

              <div>
                <h3 class="text-xl font-semibold mb-3 text-primary">2. File Mode</h3>
                <p class="mb-4 text-muted-foreground">
                  Load a JSON file and explore it interactively:
                </p>
                <pre class="bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto"><code>jsq --file data.json</code></pre>
              </div>

              <div>
                <h3 class="text-xl font-semibold mb-3 text-primary">3. Standalone Mode</h3>
                <p class="mb-4 text-muted-foreground">
                  Launch jsq REPL without any data to start fresh:
                </p>
                <pre class="bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto"><code>jsq</code></pre>
              </div>
            </div>
          </div>
        </z-card>

        <z-card>
          <div class="p-8">
            <h2 class="text-2xl font-bold mb-6">✨ Key Features</h2>
            
            <div class="grid md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">⚡</span>
                  <div>
                    <h3 class="font-semibold mb-1">Real-time Evaluation</h3>
                    <p class="text-muted-foreground">See results instantly as you type your expressions</p>
                  </div>
                </div>
                
                <div class="flex items-start gap-3">
                  <span class="text-2xl">🎨</span>
                  <div>
                    <h3 class="font-semibold mb-1">Colorful Dynamic Prompt</h3>
                    <p class="text-muted-foreground">Visual feedback with syntax highlighting and color-coded prompts</p>
                  </div>
                </div>
                
                <div class="flex items-start gap-3">
                  <span class="text-2xl">🔄</span>
                  <div>
                    <h3 class="font-semibold mb-1">Toggle Data View</h3>
                    <p class="text-muted-foreground">Press <code class="bg-muted px-2 py-1 rounded">Ctrl+R</code> to show/hide the current data</p>
                  </div>
                </div>
              </div>
              
              <div class="space-y-4">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">🤖</span>
                  <div>
                    <h3 class="font-semibold mb-1">Smart Tab Completion</h3>
                    <p class="text-muted-foreground">Intelligent autocomplete for properties, methods, and expressions</p>
                  </div>
                </div>
                
                <div class="flex items-start gap-3">
                  <span class="text-2xl">📝</span>
                  <div>
                    <h3 class="font-semibold mb-1">History Support</h3>
                    <p class="text-muted-foreground">Navigate through previous commands with arrow keys</p>
                  </div>
                </div>
                
                <div class="flex items-start gap-3">
                  <span class="text-2xl">🎯</span>
                  <div>
                    <h3 class="font-semibold mb-1">Multi-line Editing</h3>
                    <p class="text-muted-foreground">Write complex expressions across multiple lines</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </z-card>

        <z-card>
          <div class="p-8">
            <h2 class="text-2xl font-bold mb-6">🎮 Interactive Example</h2>
            
            <div class="bg-muted/50 p-6 rounded-lg font-mono text-sm">
              <div class="space-y-3">
                <div class="text-green-500">$ curl https://api.github.com/users/nnao45 | jsq</div>
                <div class="text-muted-foreground"># JSON data loaded into REPL...</div>
                <div>
                  <span class="text-cyan-500">&gt; </span> <span class="text-yellow-500">$</span>.<span class="text-blue-400">login</span>
                </div>
                <div class="text-gray-300">"nnao45"</div>
                <div>
                  <span class="text-cyan-500">&gt; </span> <span class="text-yellow-500">$</span>.<span class="text-blue-400">pick</span>(<span class="text-green-400">["login", "name", "company"]</span>)
                </div>
                <div class="text-gray-300">{{ '{' }}"login": "nnao45", "name": "Nao Minami", "company": "&#64;nnao45-labs"{{ '}' }}</div>
                <div>
                  <span class="text-cyan-500">&gt; </span> <span class="text-purple-500">.exit</span>
                </div>
              </div>
            </div>
          </div>
        </z-card>

        <z-card>
          <div class="p-8">
            <h2 class="text-2xl font-bold mb-6">⌨️ Keyboard Shortcuts</h2>
            
            <div class="grid md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="flex justify-between bg-muted/50 p-3 rounded">
                  <code class="font-semibold">Tab</code>
                  <span class="text-muted-foreground">Autocomplete</span>
                </div>
                <div class="flex justify-between bg-muted/50 p-3 rounded">
                  <code class="font-semibold">Ctrl+R</code>
                  <span class="text-muted-foreground">Toggle data view</span>
                </div>
                <div class="flex justify-between bg-muted/50 p-3 rounded">
                  <code class="font-semibold">↑/↓</code>
                  <span class="text-muted-foreground">History navigation</span>
                </div>
              </div>
              <div class="space-y-2">
                <div class="flex justify-between bg-muted/50 p-3 rounded">
                  <code class="font-semibold">Ctrl+C</code>
                  <span class="text-muted-foreground">Exit REPL</span>
                </div>
                <div class="flex justify-between bg-muted/50 p-3 rounded">
                  <code class="font-semibold">Ctrl+L</code>
                  <span class="text-muted-foreground">Clear screen</span>
                </div>
                <div class="flex justify-between bg-muted/50 p-3 rounded">
                  <code class="font-semibold">Enter</code>
                  <span class="text-muted-foreground">Execute expression</span>
                </div>
              </div>
            </div>
          </div>
        </z-card>
      </div>

      <div class="text-center">
        <p class="text-lg text-muted-foreground mb-6">
          Experience the power of interactive JSON exploration with jsq's REPL mode
        </p>
        <z-button size="lg" class="gap-2">
          <a href="https://github.com/nnao45/jsq" target="_blank" class="flex items-center gap-2 no-underline">
            Get Started with jsq
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </z-button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes gradient-x {
      0%, 100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }
    
    .animate-gradient-x {
      background-size: 200% 200%;
      animation: gradient-x 3s ease infinite;
    }
  `]
})
export class ReplComponent {
  code = `# From curl
curl https://api.example.com/data | jsq

# From file
cat data.json | jsq

# From another command
echo '{"users": [1, 2, 3]}' | jsq
`
  inputJson = JSON.stringify({
    "login": "nnao45",
    "name": "Akira Naito",
    "company": "&#64;example"
  })
}