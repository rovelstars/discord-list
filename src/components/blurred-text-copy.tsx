import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BlurredTextCopyProps {
  text: string;
  className?: string;
}

export function BlurredTextCopy({ text, className }: BlurredTextCopyProps) {
  const [isBlurred, setIsBlurred] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  const toggleBlur = () => setIsBlurred(!isBlurred);

  const handleCopy = () => {
    copyToClipboard(text);
    setIsCopied(true);
    toast("Copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="relative flex-grow">
        <p
          className={cn(
            "font-mono p-2 bg-background rounded transition-all duration-200",
            isBlurred && "blur-sm select-none",
          )}
        >
          {text}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
          onClick={toggleBlur}
          aria-label={isBlurred ? "Show text" : "Hide text"}
        >
          {isBlurred ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Button>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
      >
        {isCopied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
      <Toaster />
    </div>
  );
}
