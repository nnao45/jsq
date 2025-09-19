import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ZardButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ZardButtonComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-background text-foreground">
      <nav class="bg-muted border-b border-border fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-opacity-80">
        <div class="container mx-auto px-6 flex items-center justify-between h-16">
          <div class="flex items-center">
            <a routerLink="/" class="flex items-center gap-2 no-underline">
              <span class="text-2xl font-bold font-mono text-primary">jsq</span>
            </a>
          </div>
          
          <div class="flex items-center gap-6">
            <a 
              routerLink="/getting-started" 
              routerLinkActive="text-primary"
              class="text-muted-foreground hover:text-foreground transition-colors font-medium no-underline"
            >
              🚀
            </a>
            <a 
              routerLink="/repl" 
              routerLinkActive="text-primary"
              class="text-muted-foreground hover:text-foreground transition-colors font-medium no-underline"
            >
              REPL
            </a>
            <a 
              routerLink="/smart-dollar-methods" 
              routerLinkActive="text-primary"
              class="text-muted-foreground hover:text-foreground transition-colors font-medium no-underline"
            >
              $
            </a>
            <a 
              routerLink="/lodash-methods" 
              routerLinkActive="text-primary"
              class="text-muted-foreground hover:text-foreground transition-colors font-medium no-underline"
            >
              Lodash
            </a>
            <a 
              routerLink="/js-operations" 
              routerLinkActive="text-primary"
              class="text-muted-foreground hover:text-foreground transition-colors font-medium no-underline"
            >
              JS
            </a>
            <a 
              href="https://github.com/nnao45/jsq" 
              target="_blank" 
              class="text-muted-foreground hover:text-primary transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </nav>
      
      <main class="flex-1 py-8 pt-24">
        <router-outlet></router-outlet>
      </main>
      
      <footer class="bg-muted border-t border-border py-8 mt-16">
        <div class="container mx-auto px-6">
          <p class="text-center text-muted-foreground">Released under the MIT License. Copyright © 2024 nnao45</p>
        </div>
      </footer>
    </div>
  `,
  styles: []
})
export class AppComponent {}