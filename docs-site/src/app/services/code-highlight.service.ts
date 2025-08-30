import { Injectable } from '@angular/core';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

@Injectable({
  providedIn: 'root'
})
export class CodeHighlightService {
  highlightAll() {
    Prism.highlightAll();
  }

  highlight(code: string, language: string): string {
    const grammar = Prism.languages[language];
    if (!grammar) {
      return code;
    }
    return Prism.highlight(code, grammar, language);
  }
}