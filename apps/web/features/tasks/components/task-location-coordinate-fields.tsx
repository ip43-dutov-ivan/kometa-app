import { t } from "@kometa/i18n";
import type { TaskLocation } from "@kometa/logic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TaskLocationCoordinateFieldsProps {
  value: TaskLocation;
  disabled: boolean;
  onChange: (location: TaskLocation) => void;
}

export function TaskLocationCoordinateFields({
  value,
  disabled,
  onChange,
}: TaskLocationCoordinateFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="task-location-latitude">{t("Latitude")}</Label>
        <Input
          id="task-location-latitude"
          type="number"
          min="-90"
          max="90"
          step="any"
          value={value.latitude ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              latitude: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="task-location-longitude">{t("Longitude")}</Label>
        <Input
          id="task-location-longitude"
          type="number"
          min="-180"
          max="180"
          step="any"
          value={value.longitude ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              longitude: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          disabled={disabled}
        />
      </div>
    </div>
  );
}
