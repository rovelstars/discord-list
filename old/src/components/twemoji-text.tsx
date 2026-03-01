import Twemoji from "react-twemoji";
export default function TwemojiText({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <Twemoji
      options={{
        className: "twemoji w-auto h-[1em] inline -translate-y-0.5"+(className ? " "+className : ""),
      }}
    >
      {children}
    </Twemoji>
  );
}
