import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions?: string[];
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, suggestions, ...props }, ref) => {
    const [inputValue, setInputValue] = React.useState("");
    const [activeSuggestion, setActiveSuggestion] = React.useState("");
    const [isFocused, setIsFocused] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    // Combinar a ref fornecida pelo usuário com nossa ref interna
    const combinedRef = (node: HTMLInputElement) => {
      // Configurar a ref interna
      inputRef.current = node;
      
      // Configurar a ref fornecida pelo usuário
      if (ref) {
        if (typeof ref === 'function') {
          ref(node);
        } else {
          ref.current = node;
        }
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      
      // Verificar se há sugestões que começam com o valor atual
      if (suggestions && suggestions.length > 0 && value) {
        const matchedSuggestion = suggestions.find(suggestion => 
          suggestion.toLowerCase().startsWith(value.toLowerCase()) && suggestion !== value
        );
        
        setActiveSuggestion(matchedSuggestion || "");
      } else {
        setActiveSuggestion("");
      }
      
      // Chamar o manipulador original de onChange, se existir
      if (props.onChange) {
        props.onChange(e);
      }
    };
    
    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (props.onFocus) {
        props.onFocus(e);
      }
    };
    
    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (props.onBlur) {
        props.onBlur(e);
      }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Completar com a sugestão ao pressionar a tecla Tab
      if (e.key === 'Tab' && activeSuggestion) {
        e.preventDefault();
        setInputValue(activeSuggestion);
        
        // Atualizar o valor do input
        if (inputRef.current) {
          inputRef.current.value = activeSuggestion;
          
          // Disparar um evento de change para notificar qualquer manipulador
          const event = new Event('change', { bubbles: true });
          inputRef.current.dispatchEvent(event);
        }
      }
      
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };
    
    return (
      <div className="relative">
        <input
          type={type}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={combinedRef}
          {...props}
        />
        
        {isFocused && activeSuggestion && (
          <div className="absolute inset-0 pointer-events-none flex items-center px-3">
            <span className="text-muted-foreground">
              {inputValue}
              <span className="text-muted-foreground/50">{activeSuggestion.slice(inputValue.length)}</span>
            </span>
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
