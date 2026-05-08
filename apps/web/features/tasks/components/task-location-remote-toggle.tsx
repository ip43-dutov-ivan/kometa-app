import { t } from "@kometa/i18n";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface TaskLocationRemoteToggleProps {
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function TaskLocationRemoteToggle({
  checked,
  disabled,
  onCheckedChange,
}: TaskLocationRemoteToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <Label htmlFor="task-location-remote">{t("Remote task")}</Label>
      <Switch
        id="task-location-remote"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
