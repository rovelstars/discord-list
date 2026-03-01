import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";

export default function AddOrImportBot() {
  const form = useForm();
  return (
    <div className="block bg-popover rounded-lg w-96 md:max-w-80 shadow-black/90 group hover:shadow-2xl hover:-translate-y-2 animation duration-300 mb-4 border">
      <Popover>
        <PopoverTrigger className="flex items-center justify-center w-full h-full p-4 cursor-pointer">
          <div className="flex flex-col items-center justify-center h-full p-4">
            <img src="/img/idea.svg" className="w-24 h-24 mb-4" alt="New Bot" />
            <h1 className="text-xl font-bold text-center">Add a New Bot</h1>
            <p className="text-gray-500 text-center">
              Click here to add a new bot and show it to the world!
            </p>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-4 bg-card">
          <h2 className="text-lg font-bold">Add a New Bot</h2>
          <Form {...form}>
            <form
              onSubmit={e => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const botId = formData.get("botId") as string;
                const importType = formData.get("importType") as string;

                if (importType === "manually") {
                  window.location.href = `/dashboard/bots/new?id=${botId}`;
                } else {
                  window.location.href = `/api/bots/${botId}/import?type=${importType}`;
                }
              }}
            >
              <div className="mb-4">
                <Label htmlFor="botId">Bot ID</Label>
                <Input
                  id="botId"
                  name="botId"
                  type="text"
                  placeholder="Enter the bot ID"
                  required
                />
              </div>
              <div className="mb-4">
                <Label>Import Type</Label>
                <RadioGroup name="importType" defaultValue="manually">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id="topgg" value="topgg" />
                    <FormLabel htmlFor="topgg">Top.gg</FormLabel>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id="manually" value="manually" />
                    <FormLabel htmlFor="manually">Manually</FormLabel>
                  </div>
                </RadioGroup>
              </div>
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
              >
                Submit
              </button>
            </form>
          </Form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
