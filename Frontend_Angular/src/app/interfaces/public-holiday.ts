export interface PublicHoliday {
    date: string;
    localName: string;
    name: string;
    countryCode: string;
    fixed?: boolean;
    global:boolean;
    counties: string[] | null;
    types: string[];
}
