import { Injectable } from '@angular/core';
import { marked } from 'marked';

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {
  constructor() {
    // Configure marked options
    marked.setOptions({
      gfm: true,
      breaks: true,
      pedantic: false
    });
  }

  parse(markdown: string): string {
    return marked(markdown) as string;
  }
}