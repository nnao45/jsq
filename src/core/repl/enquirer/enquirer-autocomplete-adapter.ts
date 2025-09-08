import type { AutocompleteEngine } from '../autocomplete-engine.js';
import type { CompletionContext, CompletionResult } from '../autocomplete-engine.js';

export interface EnquirerSuggestion {
  name: string;
  value: string;
  hint?: string;
}

/**
 * AutocompleteEngineとEnquirerを繋ぐアダプター
 */
export class EnquirerAutocompleteAdapter {
  constructor(private engine: AutocompleteEngine) {}

  /**
   * Enquirer用に補完候補を取得
   */
  async getSuggestions(
    input: string, 
    data: any = null,
    cursorPosition?: number
  ): Promise<EnquirerSuggestion[]> {
    // カーソル位置が指定されていない場合は末尾
    const cursor = cursorPosition ?? input.length;
    
    // 入力が空の場合は空配列を返す
    if (!input.trim()) {
      return [];
    }

    // CompletionContextを作成
    const context: CompletionContext = {
      input,
      cursorPosition: cursor,
      currentData: data
    };

    try {
      // AutocompleteEngineから補完候補を取得
      const result = this.engine.getSuggestions(context);
      
      // Enquirer用にフォーマット
      return this.formatCompletions(result, input, cursor);
    } catch (error) {
      console.error('Autocomplete error:', error);
      return [];
    }
  }

  /**
   * CompletionResultをEnquirer形式に変換
   */
  private formatCompletions(
    result: CompletionResult,
    input: string,
    cursorPosition: number
  ): EnquirerSuggestion[] {
    return result.completions.map(completion => ({
      name: this.formatDisplayName(completion),
      value: this.getCompletionValue(completion, result, input),
      hint: undefined
    }));
  }

  /**
   * 表示用の名前をフォーマット
   */
  private formatDisplayName(completion: string): string {
    // メソッド名かプロパティ名かを判定
    let icon = '• ';
    
    // 関数名らしい場合
    if (/^[a-z][a-zA-Z0-9]*$/.test(completion)) {
      icon = '🔧 ';
    }
    // 配列インデックスの場合
    else if (/^\[\d+\]$/.test(completion)) {
      icon = '📦 ';
    }
    // 大文字で始まる場合（クラス名やグローバル）
    else if (/^[A-Z]/.test(completion)) {
      icon = '🌐 ';
    }

    return `${icon}${completion}`;
  }

  /**
   * 補完を適用した後の値を取得
   */
  private getCompletionValue(
    completion: string,
    result: CompletionResult,
    input: string
  ): string {
    const { replaceStart, replaceEnd } = result;
    
    // 新しい値を構築
    const beforeReplace = input.substring(0, replaceStart);
    const afterReplace = input.substring(replaceEnd);
    const newValue = beforeReplace + completion + afterReplace;
    
    return newValue;
  }

  /**
   * リアルタイム検索用のフィルター
   */
  filterSuggestions(
    suggestions: EnquirerSuggestion[],
    query: string
  ): EnquirerSuggestion[] {
    if (!query) return suggestions;
    
    const lowerQuery = query.toLowerCase();
    
    return suggestions.filter(suggestion => {
      const name = suggestion.name.toLowerCase();
      const value = suggestion.value.toLowerCase();
      
      // 名前か値にクエリが含まれているかチェック
      return name.includes(lowerQuery) || value.includes(lowerQuery);
    });
  }
}