import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ChartBar, GanttChart, Activity } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { motion } from "framer-motion";

interface TradingPreferencesProps {
  defaultRiskLevel?: string;
  defaultCurrency?: string;
  onRiskLevelChange?: (value: string) => void;
  onCurrencyChange?: (value: string) => void;
}

export function TradingPreferences({
  defaultRiskLevel = "moderado",
  defaultCurrency = "usd",
  onRiskLevelChange,
  onCurrencyChange
}: TradingPreferencesProps) {
  const [riskLevel, setRiskLevel] = useState(defaultRiskLevel);
  const [currency, setCurrency] = useState(defaultCurrency);

  const handleRiskLevelChange = (value: string) => {
    setRiskLevel(value);
    if (onRiskLevelChange) {
      onRiskLevelChange(value);
    }
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    if (onCurrencyChange) {
      onCurrencyChange(value);
    }
  };

  return (
    <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
      <SettingsSection
        title="Preferências de Trading"
        description="Configure suas preferências gerais de trading"
        icon={<Activity className="h-4 w-4 text-indigo-400" />}
        className="bg-gradient-to-br from-indigo-900/10 via-black/20 to-black/30"
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <Label htmlFor="risk-level" className="text-white/90 font-medium">Nível de Risco</Label>
            <RadioGroup id="risk-level" value={riskLevel} onValueChange={handleRiskLevelChange} className="gap-3">
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <RadioGroupItem value="conservador" id="conservador" />
                <Label htmlFor="conservador" className="cursor-pointer flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  Conservador
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <RadioGroupItem value="moderado" id="moderado" />
                <Label htmlFor="moderado" className="cursor-pointer flex items-center gap-2">
                  <ChartBar className="h-4 w-4 text-blue-400" />
                  Moderado
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <RadioGroupItem value="agressivo" id="agressivo" />
                <Label htmlFor="agressivo" className="cursor-pointer flex items-center gap-2">
                  <GanttChart className="h-4 w-4 text-rose-400" />
                  Agressivo
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label htmlFor="currency" className="text-white/90 font-medium">Moeda Padrão</Label>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger id="currency" className="w-full bg-white/5 border-white/10">
                <SelectValue placeholder="Selecione uma moeda" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 backdrop-blur-md border-white/10">
                <SelectItem value="usd" className="focus:bg-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">$</span>
                    <span>USD (Dólar)</span>
                  </div>
                </SelectItem>
                <SelectItem value="brl" className="focus:bg-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">R$</span>
                    <span>BRL (Real)</span>
                  </div>
                </SelectItem>
                <SelectItem value="eur" className="focus:bg-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">€</span>
                    <span>EUR (Euro)</span>
                  </div>
                </SelectItem>
                <SelectItem value="btc" className="focus:bg-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">₿</span>
                    <span>BTC (Bitcoin)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsSection>
    </motion.div>
  );
} 