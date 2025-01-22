//this link component will handle popups: desktop - modal, mobile - drawer. it wont show for internal links.

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Ghost } from "lucide-react";

export default function Link(params: any) {
  const [open, setOpen] = useState(false);

  if (
    params.href.startsWith("http") &&
    new URL(params.href).hostname != "discord.rovelstars.com"
  )
    return (
      <>
        <a
          {...params}
          href={params.href}
          onClick={e => {
            e.preventDefault();
            setOpen(true);
          }}
        />
        <LinkPopup setOpen={setOpen} open={open} url={params.href} />
      </>
    );
  return <a {...params} />;
}

function LinkPopup({
  setOpen,
  open,
  url,
}: {
  setOpen: (open: boolean) => void;
  open: boolean;
  url: string;
}) {
  const discordHosts = ["discord.com", "discordapp.com", "discord.gg"];

  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="inline-flex text-2xl font-bold ">
              {discordHosts.includes(new URL(url).hostname) ? (
                <>Opening in Discord </>
              ) : (
                "External Website"
              )}
            </DialogTitle>
            <DialogDescription>
              {!discordHosts.includes(new URL(url).hostname) ? (
                <>
                  You are about to leave this site and visit an external link (
                  <span className="text-primary underline">
                    {new URL(url).hostname}
                  </span>
                  ). Do you want to continue? This link might be unsafe.
                </>
              ) : (
                <>We wish you a safe journey! </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="default"
            onClick={() => {
              setOpen(false);
              window.open(
                url,
                "popup",
                !discordHosts.includes(new URL(url).hostname)
                  ? ""
                  : "width=600,height=600",
              ); //discord links will open in a new tab, whereas other links will open in a popup
            }}
          >
            Open
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="inline-flex text-2xl font-bold ">
            {discordHosts.includes(new URL(url).hostname) ? (
              <>Opening in Discord</>
            ) : (
              "External Website"
            )}
          </DrawerTitle>
          <DrawerDescription>
            {!discordHosts.includes(new URL(url).hostname) ? (
              <>
                You are about to leave this site and visit an external link (
                <span className="text-primary underline">
                  {new URL(url).hostname}
                </span>
                ). Do you want to continue? This link might be unsafe.
              </>
            ) : (
              <>We wish you a safe journey! </>
            )}
          </DrawerDescription>
        </DrawerHeader>
        <Button
          variant="default"
          asChild
          onClick={() => {
            setOpen(false);
            window.open(
              url,
              "popup",
              !discordHosts.includes(new URL(url).hostname)
                ? ""
                : "width=600,height=600",
            );
          }}
          className="mx-4"
        >
          Open
        </Button>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
