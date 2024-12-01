import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
export default function LoginButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(true);
  const [servers, setServers] = useState(true);
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="default" id="login-button">Login</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl">
              Choose Scopes
            </DialogTitle>
          </DialogHeader>
          <div className="items-top flex space-x-2">
            <Checkbox id="servers" defaultChecked={true}
            onCheckedChange={()=>{
              setServers(!servers);
            }}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="servers"
                className="text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Join Servers
              </label>
              <p className="text-sm text-muted-foreground">
                This is used to add you to servers you want to join.
              </p>
            </div>
            </div>
            <div className="items-top flex space-x-2">
            <Checkbox id="email" defaultChecked={true} onCheckedChange={()=>{
              setEmail(!email);
            }} />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="email"
                className="text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Email
              </label>
              <p className="text-sm text-muted-foreground">
                This is used to get your email.
              </p>
              </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setOpen(false);
                const redirect = new URL(window.location.href).pathname;
                const url = new URL("/login", window.location.href);
                url.searchParams.append("servers", servers.toString());
                url.searchParams.append("email", email.toString());
                //save cookie redirect
                document.cookie = `redirect=${redirect}; path=/;`;
                window.location.href = url.toString();
              }}
            >
              Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
