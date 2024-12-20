import HtmlToReact, { Parser as HtmlToReactParser } from "html-to-react";
import Link from "@/components/link";
//@ts-ignore
const htmlToReactParser = new HtmlToReactParser();
//@ts-ignore
const processNodeDefinitions = new HtmlToReact.ProcessNodeDefinitions();

//we need to replace all the a elements with our custom Link element
const processingInstructions = [
  {
    shouldProcessNode: (node: any) => node.name === "a",
    processNode: (node: any, children: any, index: any) => {
      return (
        <Link key={index} href={node.attribs.href}>
          {children}
        </Link>
      );
    },
  },
  {
    shouldProcessNode: (node: any) => node.name === "iframe",
    processNode: (node: any, children: any, index: any) => {
      return (
        <iframe
          key={index}
          src={node.attribs.src}
          width="100%"
          height="100vh"
          className="min-h-[100vh] rounded-md "
          sandbox="allow-forms allow-popups allow-scripts allow-top-navigation-by-user-activation"
        />
      );
    },
  },
  {
    shouldProcessNode: (node: any) => node.name === "img",
    processNode: (node: any, children: any, index: any) => {
      return (
        <img
          key={index}
          src={node.attribs.src
            .replaceAll("discordapp.com", "discordapp.xyz")
            .replaceAll("discordapp.net", "discordapp.xyz")}
            loading="lazy"
          alt={node.attribs.alt}
          width={node.attribs.width || 100}
          height={node.attribs.height || 100}
          crossOrigin="anonymous"
          className="w-auto h-auto"
        />
      );
    },
  },
  {
    shouldProcessNode: () => true,
    processNode: processNodeDefinitions.processDefaultNode,
  },
];

export default function toJSX({ html }: { html: string }) {
  return htmlToReactParser.parseWithInstructions(
    html,
    () => true,
    processingInstructions
  );
}
