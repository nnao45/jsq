import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { ZardCardComponent } from '@shared/components/card/card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ZardButtonComponent, ZardCardComponent],
  template: `
    <div class="bg-gradient-to-br from-muted to-background py-16 border-b border-border">
      <div class="container mx-auto px-6">
        <div class="max-w-4xl mx-auto text-center">
          <h1 class="text-6xl font-bold font-mono text-primary mb-4 tracking-tight">jsq</h1>
          <p class="text-2xl font-semibold text-foreground mb-4">JavaScript-Powered JSON Query CLI Tool</p>
          <p class="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Process JSON with chaining and 110+ built-in methods, secure by default
          </p>
          <div class="flex gap-4 justify-center">
            <pre class="inline-block mb-8"><code class="language-bash">npm install -g &#64;nnao45/jsq</code></pre>
          </div>
        </div>
      </div>
    </div>

    <section class="py-16">
      <div class="container mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <z-card class="bg-muted transition-all hover:-translate-y-1 hover:shadow-lg">
            <div class="text-5xl mb-4">🔗</div>
            <h3 class="text-xl font-semibold mb-3 text-foreground">jQuery-style Chaining API</h3>
            <p class="text-muted-foreground leading-relaxed">Intuitive syntax with comprehensive utility library including RxJS-style reactive operators - no external dependencies needed</p>
          </z-card>
          
          <z-card class="bg-muted transition-all hover:-translate-y-1 hover:shadow-lg">
            <div class="text-5xl mb-4">🔒</div>
            <h3 class="text-xl font-semibold mb-3 text-foreground">Secure VM Execution by Default</h3>
            <p class="text-muted-foreground leading-relaxed">All expressions run in a secure sandbox environment, preventing access to filesystem, network, and shell unless explicitly enabled</p>
          </z-card>
          
          <z-card class="bg-muted transition-all hover:-translate-y-1 hover:shadow-lg">
            <div class="text-5xl mb-4">🌐</div>
            <h3 class="text-xl font-semibold mb-3 text-foreground">Run Data Transform Anywhere</h3>
            <p class="text-muted-foreground leading-relaxed">Works seamlessly across browsers, Node.js, Deno, and Bun - process JSON with the same code everywhere</p>
          </z-card>
          
          <z-card class="bg-muted transition-all hover:-translate-y-1 hover:shadow-lg">
            <div class="text-5xl mb-4">✨</div>
            <h3 class="text-xl font-semibold mb-3 text-foreground">Beautiful Interactive REPL</h3>
            <p class="text-muted-foreground leading-relaxed">Real-time JSON processing with a stunning, colorful interface featuring dynamic prompts and instant feedback</p>
          </z-card>
        </div>
      </div>
    </section>

    <section class="py-12">
      <div class="container mx-auto px-6">
        <div class="prose mx-auto max-w-3xl">
          <h2>Quick Example</h2>
          <p>Transform complex JSON with intuitive JavaScript:</p>
          
          <div class="gap-6 mt-6">
            <h4 class="text-base font-semibold mb-2 text-muted-foreground">Traditional jq syntax</h4>
            <pre><code class="language-bash">cat users.json | jq '.users[] | select(.active == true) | .name'</code></pre>

            <h4 class="text-base font-semibold mb-2 text-muted-foreground">jsq - intuitive and powerful</h4>
            <pre><code class="language-bash">cat users.json | jsq '$.users.filter(u => u.active).pluck("name")'</code></pre>
          </div>
        </div>
      </div>
    </section>

    <section class="py-12">
      <div class="container mx-auto px-6">
        <div class="prose mx-auto max-w-3xl">
          <h2>Why jsq?</h2>
          
          <h3>🚀 Familiar JavaScript Syntax</h3>
          <p>No need to learn a new query language. Use the JavaScript you already know:</p>
          <pre><code class="language-bash"># Complex transformations made simple
cat data.json | jsq '
  $.items
    .filter(item => item.price > 100)
    .groupBy(item => item.category)
    .entries()
    .map(([cat, items]) => ({{ '{' }}
      category: cat,
      avgPrice: _.mean(items.map(i => i.price))
    {{ '}' }}))
'</code></pre>

          <h3>🔒 Security First Design</h3>
          <p>Unlike other JavaScript-based tools, jsq prioritizes security:</p>
          <ul>
            <li><strong>VM isolation by default</strong> - jsq evaluates expressions exclusively on <a href="https://github.com/justjake/quickjs-emscripten" target="_blank">quickjs-emscripten</a>, enabling pure and isolated code execution while supporting flexible JavaScript method chaining</li>
            <li><strong>Resource limits</strong> - Control memory and CPU usage</li>
            <li><strong>No filesystem/network access</strong> - Unless explicitly enabled with <code>--unsafe</code></li>
          </ul>

          <h3>🔥 Superior to Other Tools</h3>
          <p>jsq combines the best of all JSON processors:</p>
          <ul>
            <li><strong>vs jq</strong> - Familiar JavaScript syntax instead of custom DSL, with javascript primitive object (e.g. Date, Object, Math...)</li>
            <li><strong>vs fx</strong> - 85+ built-in methods vs basic JS operations, streaming support for large files</li>
            <li><strong>vs jello</strong> - No Python runtime required, VM isolation for security, real-time REPL</li>
            <li><strong>vs gojq/jaq</strong> - Cross-platform (Node.js/Deno/Bun), interactive development experience</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="bg-muted py-12 mt-16">
      <div class="container mx-auto px-6">
        <div class="text-center">
          <h2 class="text-3xl font-semibold mb-4">Ready to Get Started?</h2>
          <p class="text-muted-foreground mb-6">Install jsq and start transforming your JSON data with the power of JavaScript:</p>
          <pre class="inline-block mb-8"><code class="language-bash">npm install -g &#64;nnao45/jsq</code></pre>
          <div>
            <a routerLink="/getting-started">
              <z-button zType="default" zSize="lg">Continue to Getting Started →</z-button>
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
  .text-white {
    color: white;
  }  
`]
})
export class HomeComponent {}