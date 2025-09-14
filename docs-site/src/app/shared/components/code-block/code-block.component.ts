import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="code-block-container">
      <pre class="code-block"><code [innerHTML]="code"></code><button 
        class="copy-button"
        (click)="copyToClipboard()"
        [attr.aria-label]="copied ? 'Copied!' : 'Copy to clipboard'"
      >
        <svg *ngIf="!copied" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span *ngIf="copied" class="check-mark">✓</span>
      </button></pre>
    </div>
  `,
  styles: [`
    .code-block-container {
      position: relative;
      display: inline-block;
    }

    .code-block {
      position: relative;
      padding-right: 3rem;
    }

    .copy-button {
      position: absolute;
      top: 50%;
      right: 0.75rem;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: hsl(var(--muted-foreground));
      transition: all 0.2s ease;
      border-radius: 0.375rem;
    }

    .copy-button:hover {
      background: hsl(var(--muted));
      color: hsl(var(--foreground));
    }

    .copy-button:active {
      transform: translateY(-50%) scale(0.95);
    }

    .check-mark {
      color: #10b981;
      font-weight: bold;
      font-size: 18px;
    }
  `]
})
export class CodeBlockComponent implements OnInit {
  @Input() code: string = '';
  @Input() rawCode: string = '';
  copied = false;

  ngOnInit() {
    if (!this.rawCode) {
      this.rawCode = this.code;
    }
  }

  copyToClipboard() {
    const textToCopy = this.rawCode || this.code.replace(/<[^>]*>/g, '');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    });
  }
}