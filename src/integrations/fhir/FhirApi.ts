import InitData from "@/models/InitData";

export interface FhirApi {
    getInitState(): Promise<InitData>;

    readonly apiName: string;
    readonly isSimulation: boolean;
}