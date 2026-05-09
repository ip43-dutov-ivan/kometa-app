import { t } from "@kometa/i18n";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface LocationRemoteToggleProps {
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function LocationRemoteToggle({
  checked,
  disabled,
  onCheckedChange,
}: LocationRemoteToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <Label htmlFor="location-remote">{t("Remote task")}</Label>
      <Switch
        id="location-remote"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
