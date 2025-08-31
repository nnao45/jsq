import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ZardInputDirective } from '@shared/components/input/input.directive';

declare global {
  interface Window {
    jsq: any;
    JSQ: any;
  }
}

@Component({
  selector: 'app-jsq-playground',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardInputDirective],
  template: `
    <div class="jsq-playground">
      <div class="playground-header">
        <h4>Try it yourself!</h4>
        <button (click)="resetPlayground()" class="reset-button" title="Reset">↺</button>
      </div>
      
      <div class="input-section">
        <label>Input Data (JSON):</label>
        <textarea
          z-input
          [(ngModel)]="jsonInput"
          (ngModelChange)="onJsonChange()"
          [zStatus]="jsonError ? 'error' : undefined"
          rows="4"
          placeholder="Enter JSON data..."
        ></textarea>
        <div *ngIf="jsonError" class="error-message">{{ jsonError }}</div>
      </div>

      <div class="expression-section">
        <label>jsq Expression:</label>
        <input
          z-input
          [(ngModel)]="expression"
          (ngModelChange)="onExpressionChange()"
          [zStatus]="expressionError ? 'error' : undefined"
          placeholder="$.filter(x => x > 2)"
        />
        <div *ngIf="expressionError" class="error-message">{{ expressionError }}</div>
      </div>

      <div class="output-section">
        <label>Output:</label>
        <pre class="output" [class.success]="!error && result !== undefined">{{ 
          loading ? 'Loading...' : 
          error ? error : 
          result !== undefined ? formatOutput(result) : 
          'Enter an expression to see the result'
        }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .jsq-playground {
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin: 1.5rem 0;
      background: var(--surface);
    }

    .playground-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .playground-header h4 {
      margin: 0;
      color: var(--text-primary);
    }

    .reset-button {
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 0.375rem;
      padding: 0.375rem 0.75rem;
      cursor: pointer;
      font-size: 1.125rem;
      transition: opacity 0.2s;
    }

    .reset-button:hover {
      opacity: 0.8;
    }

    .input-section,
    .expression-section,
    .output-section {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.375rem;
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .output {
      width: 100%;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      border: 1px solid var(--border-color);
      border-radius: 0.375rem;
      background: var(--background);
      color: var(--text-primary);
    }

    .output {
      padding: 0.75rem;
      margin: 0;
      overflow-x: auto;
      min-height: 60px;
      background: var(--code-bg);
    }

    .output.success {
      border-color: var(--primary-color);
    }

    .error-message {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .output:has(.error) {
      color: #ef4444;
    }

    textarea {
      resize: vertical;
      min-height: 80px;
    }
  `]
})
export class JsqPlaygroundComponent implements OnInit, OnDestroy {
  @Input() initialData: any = [1, 2, 3, 4, 5];
  @Input() initialExpression: string = '$.filter(x => x > 2)';

  jsonInput: string = '';
  expression: string = '';
  result: any = undefined;
  error: string = '';
  jsonError: string = '';
  expressionError: string = '';
  loading: boolean = false;
  
  private jsq: any = null;
  private destroy$ = new Subject<void>();
  private jsonChange$ = new Subject<void>();
  private expressionChange$ = new Subject<void>();

  ngOnInit() {
    // Initialize inputs
    this.jsonInput = JSON.stringify(this.initialData, null, 2);
    this.expression = this.initialExpression;
    
    // Set up debounced change handlers
    this.jsonChange$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => this.execute());
    
    this.expressionChange$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => this.execute());
    
    // Load jsq library
    this.loadJsq();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatOutput(value: any): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return String(value);
    }
  }

  validateJson(): boolean {
    try {
      if (this.jsonInput.trim()) {
        JSON.parse(this.jsonInput);
        this.jsonError = '';
        return true;
      }
      this.jsonError = '';
      return true;
    } catch (e: any) {
      this.jsonError = 'Invalid JSON: ' + e.message;
      return false;
    }
  }

  async execute() {
    if (!this.jsq || !this.validateJson()) {
      return;
    }

    this.error = '';
    this.expressionError = '';
    this.loading = true;

    try {
      const data = this.jsonInput.trim() ? JSON.parse(this.jsonInput) : null;
      const res = await this.jsq.evaluate(this.expression, data);
      this.result = res;
    } catch (e: any) {
      this.error = e.message;
      if (e.message.includes('Unexpected') || e.message.includes('Syntax')) {
        this.expressionError = 'Syntax error in expression';
      }
    } finally {
      this.loading = false;
    }
  }

  onJsonChange() {
    this.jsonChange$.next();
  }

  onExpressionChange() {
    this.expressionChange$.next();
  }

  resetPlayground() {
    this.jsonInput = JSON.stringify(this.initialData, null, 2);
    this.expression = this.initialExpression;
    this.execute();
  }

  private async loadJsq() {
    try {
      // Wait for jsq to be loaded from index.html
      let attempts = 0;
      while ((!window.JSQ && !window.jsq) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (window.jsq) {
        console.log('Found jsq on window');
        this.jsq = window.jsq;
        // jsq is already auto-initialized from jsq-browser.js
        console.log('Using pre-initialized jsq instance');
        // Execute initial expression
        this.execute();
      } else if (window.JSQ) {
        console.log('Found JSQ constructor, creating instance...');
        this.jsq = new window.JSQ();
        await this.jsq.initialize();
        console.log('JSQ initialized successfully');
        // Execute initial expression
        this.execute();
      } else {
        throw new Error('jsq library not found on window object');
      }
    } catch (e) {
      console.error('Failed to load jsq:', e);
      this.error = 'Failed to load jsq library: ' + (e as Error).message;
    }
  }
}