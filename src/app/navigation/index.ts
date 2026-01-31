// src/app/navigation/index.ts
import { archive } from "./segments/archive";
import { documents } from "./segments/documents";
import { dashboards } from "./segments/dashboards";
import { support } from "./segments/support";

export const navigation = [dashboards, support, archive, documents];
