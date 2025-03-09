import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  suggestions?: string[];
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, suggestions, ...props }, ref) => {
    const [textValue, setTextValue] = React.useState("");
    const [activeSuggestion, setActiveSuggestion] = React.useState("");
    const [isFocused, setIsFocused] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Combinar a ref fornecida pelo usuário com nossa ref interna
    const combinedRef = (node: HTMLTextAreaElement) => {
      // Configurar a ref interna
      textareaRef.current = node;
      
      // Configurar a ref fornecida pelo usuário
      if (ref) {
        if (typeof ref === 'function') {
          ref(node);
        } else {
          ref.current = node;
        }
      }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setTextValue(value);
      
      // Verificar se há sugestões que começam com o valor atual
      if (suggestions && suggestions.length > 0 && value) {
        const lastWord = value.split(/\s+/).pop() || "";
        
        if (lastWord.length > 1) {
          const matchedSuggestion = suggestions.find(suggestion => 
            suggestion.toLowerCase().startsWith(lastWord.toLowerCase()) && suggestion !== lastWord
          );
          
          if (matchedSuggestion) {
            setActiveSuggestion(matchedSuggestion);
          } else {
            setActiveSuggestion("");
          }
        } else {
          setActiveSuggestion("");
        }
      } else {
        setActiveSuggestion("");
      }
      
      // Chamar o manipulador original de onChange, se existir
      if (props.onChange) {
        props.onChange(e);
      }
    };
    
    const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      if (props.onFocus) {
        props.onFocus(e);
      }
    };
    
    const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      if (props.onBlur) {
        props.onBlur(e);
      }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Completar com a sugestão ao pressionar a tecla Tab
      if (e.key === 'Tab' && activeSuggestion) {
        e.preventDefault();
        
        const words = textValue.split(/\s+/);
        const lastWord = words.pop() || "";
        const newWords = [...words, activeSuggestion];
        const newValue = newWords.join(" ") + " ";
        
        setTextValue(newValue);
        
        // Atualizar o valor do textarea
        if (textareaRef.current) {
          textareaRef.current.value = newValue;
          
          // Disparar um evento de change para notificar qualquer manipulador
          const event = new Event('change', { bubbles: true });
          textareaRef.current.dispatchEvent(event);
        }
      }
      
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };
    
    // Renderizar sugestão no textarea é mais desafiador, vamos simplificar mostrando abaixo
    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          value={textValue}
          onChange={handleTextareaChange}
          onFocus={handleTextareaFocus}
          onBlur={handleTextareaBlur}
          onKeyDown={handleKeyDown}
          ref={combinedRef}
          {...props}
        />
        
        {isFocused && activeSuggestion && (
          <div className="absolute bottom-2 right-3 text-sm bg-background/90 px-2 py-1 rounded-md border border-input">
            Pressione Tab para: <span className="text-primary">{activeSuggestion}</span>
          </div>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
