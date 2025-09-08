declare module 'enquirer' {
  export interface Choice {
    name: string;
    message?: string;
    value?: any;
    hint?: string;
    role?: string;
    enabled?: boolean;
    disabled?: boolean | string;
  }

  export interface AutoCompleteOptions {
    name: string;
    message?: string;
    initial?: string;
    choices?: (string | Choice)[];
    suggest?: ((input: string, choices: Choice[]) => Choice[] | Promise<Choice[]>) | ((input: string) => Promise<string[]>);
    format?: (value: string) => string | Promise<string>;
    result?: (value: string) => string | Promise<string>;
    limit?: number;
    maxHistory?: number;
    history?: {
      store?: string;
      autosave?: boolean;
    };
  }

  export class AutoComplete {
    constructor(options: AutoCompleteOptions);
    
    // プロパティ
    input: string;
    cursor: number;
    value: string;
    choices: Choice[];
    
    // メソッド
    keypress(input: string, key: any): Promise<void>;
    render(): Promise<void>;
    submit(): Promise<void>;
    run(): Promise<string>;
  }
}