import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Eraser } from "lucide-react";

export type SignatureResult = { nome: string; dataUrl: string };

export function SignaturePad({
  label,
  onChange,
  initialName = "",
}: {
  label: string;
  onChange: (sig: SignatureResult | null) => void;
  initialName?: string;
}) {
  const ref = useRef<SignatureCanvas>(null);
  const [nome, setNome] = useState(initialName);

  const emit = (n: string) => {
    if (!ref.current || ref.current.isEmpty() || !n.trim()) {
      onChange(null);
      return;
    }
    onChange({ nome: n.trim(), dataUrl: ref.current.toDataURL("image/png") });
  };

  return (
    <div className="space-y-2">
      <Label className="font-semibold">{label}</Label>
      <Input
        placeholder="Nome completo"
        value={nome}
        onChange={(e) => { setNome(e.target.value); emit(e.target.value); }}
      />
      <div className="relative border-2 border-dashed border-border rounded-lg bg-white overflow-hidden">
        <SignatureCanvas
          ref={ref}
          canvasProps={{ className: "w-full h-40 touch-none" }}
          onEnd={() => emit(nome)}
          penColor="#0f172a"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1"
          onClick={() => { ref.current?.clear(); onChange(null); }}
        >
          <Eraser className="h-3 w-3 mr-1" /> Limpar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Assine no quadro acima usando o dedo ou mouse.</p>
    </div>
  );
}
