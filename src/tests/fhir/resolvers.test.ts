import {
    dateTimePeriodResolver,
    dateTimeResolver,
    dipsDepartmentReferenceFromExtensions,
    dnrFromIdentifier,
    dnrFromIdentifiers,
    fnrFromIdentifier,
    fnrFromIdentifiers,
    fnrSyntetisk40FromIdentifier,
    hprNumberFromIdentifiers,
    isDateWithinPeriod,
    organizationNumberFromIdentifier,
    phoneContactResolver,
    postalAddressResolver, resolveUsersDepartmentReference,
} from "@/integrations/fhir/resolvers";
import {
    ContactPointSystemKind,
    IContactPoint,
    IdentifierUseKind,
    IExtension,
    IIdentifier,
    IPeriod
} from "@ahryman40k/ts-fhir-types/lib/R4";
import DatePeriod, { datePeriod } from "@/models/DatePeriod";
import Address from "@/models/Address";
import { HprNumber } from "@/models/HprNumber";
import { R4 } from "@ahryman40k/ts-fhir-types";
import { validateOrThrow } from "@/integrations/fhir/fhirValidator";

describe(`fhir dateTime resolver`, () => {
    const validTestcases = {
        "2023-04-01T01:02:03+02:00": new Date("2023-04-01T01:02:03+02:00"),
        "2023-04-01": new Date("2023-04-01T00:00:00Z"),
        "2023-04": new Date("2023-04-01T00:00:00Z"),
        "2023": new Date("2023-01-01T00:00:00Z"),
    }

    test(`valid inputs should resolve to expected Date`, () => {
        for(const [input, expected] of Object.entries(validTestcases)) {
            expect(dateTimeResolver(input)).toEqual(expected)
        }
    })
})

describe('fhir dateTimePeriodResolver', () => {
    type TestCase = {
        input: IPeriod,
        expected: DatePeriod,
    }
    const inputIPeriod = (start?: string, end?: string): IPeriod => ({start, end})
    const validTestcases: TestCase[] = [
        {
            input: inputIPeriod("2023-04-01T12:23:00+02:00", "2023-05-12"),
            expected: {start: new Date("2023-04-01T12:23:00+02:00"), end: new Date("2023-05-12")}
        },
        {
            input: inputIPeriod("2023-04-01T12:23:00+02:00", undefined),
            expected: {start: new Date("2023-04-01T12:23:00+02:00")}
        },
    ]
    test(`valid inputs should resolve to expected period`, () => {
        for(const testCase of validTestcases) {
            expect(dateTimePeriodResolver(testCase.input)).toEqual(testCase.expected)
        }
    })
});

describe('fhir isDateWithinPeriod', () => {
    test('with both start and end specified should work', () => {
        const period = datePeriod(new Date("2021-04-02"), new Date("2021-04-05"))
        const before = new Date("2021-04-01")
        const within = new Date("2021-04-03")
        const after = new Date("2021-04-06")
        expect(isDateWithinPeriod(before, period)).toBe(false)
        expect(isDateWithinPeriod(within, period)).toBe(true)
        expect(isDateWithinPeriod(after, period)).toBe(false)
        expect(isDateWithinPeriod(period.start!, period)).toBe(true)
        expect(isDateWithinPeriod(period.end!, period)).toBe(true)
    })
    test('without end should work', () => {
        const period = datePeriod(new Date("2021-04-02"), undefined)
        const before = new Date("2021-04-01")
        const within = new Date("2021-04-03")
        expect(isDateWithinPeriod(before, period)).toBe(false)
        expect(isDateWithinPeriod(within, period)).toBe(true)
        expect(isDateWithinPeriod(period.start!, period)).toBe(true)
    })
    test('with undefined start always results in undefined', () => {
        const period = datePeriod(undefined, new Date())
        const before = new Date("2021-04-01")
        expect(isDateWithinPeriod(before, period)).toBeUndefined()
        expect(isDateWithinPeriod(period.end!, period)).toBeUndefined()
    })
})

describe('fhir postalAddressResolver', () => {
    const input1 = [
        {
            "line": [
                "235 NORTH PEARL STREET"
            ],
            "city": "BROCKTON",
            "state": "MA",
            "postalCode": "02301",
            "country": "US"
        }
    ]
    const expect1: Address = {
        line1: input1[0].line[0],
        line2: undefined,
        postalCode: input1[0].postalCode,
        city: input1[0].city
    }
    test('with one address without any filtering info, return it', () => {
        expect(postalAddressResolver(input1)).toEqual(expect1)
    })
    // XXX Add more testcases as real world data is found
})

describe('fhir phoneContactResolver', () => {
    const input1: IContactPoint[] = [
        {
            "system": ContactPointSystemKind._phone,
            "value": "5084273000"
        }
    ];
    const expected1 = input1[0].value
    test('with one phone without any filtering info, return it', () => {
        expect(phoneContactResolver(input1)).toEqual(expected1)
    })
    // XXX Add more testcases as real world data is found
})

describe('fhir hprNumberFromIdentifiers', () => {
    test('a identifiers array with empty hpr number, but others populated', () => {
        const identifiers: IIdentifier[] = [
            {
                "use": IdentifierUseKind._official,
                "system": "urn:oid:1.3.6.1.4.1.9038.51",
                "value": "ASC"
            },
            {
                "use": IdentifierUseKind._official,
                "system": "urn:oid:1.3.6.1.4.1.9038.51.1",
                "value": "1000755"
            },
            {
                "use": IdentifierUseKind._official,
                "system": "urn:oid:2.16.578.1.12.4.1.4.4",
                "value": ""
            }
        ]
        expect(hprNumberFromIdentifiers(identifiers)).toBeUndefined()
    })
    test('a identifiers array with no hpr number element, but others populated', () => {
        const identifiers: IIdentifier[] = [
            {
                "use": IdentifierUseKind._official,
                "system": "urn:oid:1.3.6.1.4.1.9038.51",
                "value": "ASC"
            },
            {
                "use": IdentifierUseKind._official,
                "system": "urn:oid:1.3.6.1.4.1.9038.51.1",
                "value": "1000755"
            }
        ]
        expect(hprNumberFromIdentifiers(identifiers)).toBeUndefined()
    })
    test('a identifiers array with hpr number element and others', () => {
        const hprNumber = "001234567" satisfies HprNumber
        const identifiers: IIdentifier[] = [
            {
                "use": IdentifierUseKind._official,
                "system": "urn:oid:1.3.6.1.4.1.9038.51",
                "value": "ASC"
            },
            {
                "use": IdentifierUseKind._official,
                "system": "urn:oid:1.3.6.1.4.1.9038.51.1",
                "value": "1000755"
            },
            {
                "use": IdentifierUseKind._official,
                "system": "urn:oid:2.16.578.1.12.4.1.4.4",
                "value": hprNumber
            }
        ]
        expect(hprNumberFromIdentifiers(identifiers)).toEqual(hprNumber)
    })
    test('resolving organization number from IIdentifier', () => {
        const orgNum = "970948139"
        const id: IIdentifier = {
            "use": IdentifierUseKind._official,
            "system": "urn:oid:2.16.578.1.12.4.1.4.101",
            "value": orgNum
        }
        expect(organizationNumberFromIdentifier(id)).toEqual(orgNum)
    })
});

const fnrInput = "12082190455"
const fnrIdentifierInput = validateOrThrow(R4.RTTI_Identifier.decode({
    "use": "official",
    "system": "urn:oid:2.16.578.1.12.4.1.4.1",
    "value": fnrInput
}))

const fnrSyntetisk40Input = "02512351754"
const fnrSyntetisk40IdentifierInput = validateOrThrow(R4.RTTI_Identifier.decode({
    "use": "temp",
    "system": "urn:oid:2.16.578.1.12.4.1.4.3",
    "value": fnrSyntetisk40Input
}))

const dnrInput = "43056078023"
const dnrIdentifierInput = validateOrThrow(R4.RTTI_Identifier.decode({
    "use": "official",
    "system": "urn:oid:2.16.578.1.12.4.1.4.2",
    "value": dnrInput
}))

describe("fhir resolve fnr from identifier", () => {
    test("with valid single input", () => {
        const expected = "12082190455"
        expect(fnrFromIdentifier(fnrIdentifierInput)).toEqual(expected)
    })
})

describe("fhir resolve synthetic fnr from identifier", () => {
    test("with valid single input", () => {
        const expected = "02512351754"
        expect(fnrSyntetisk40FromIdentifier(fnrSyntetisk40IdentifierInput)).toEqual(expected)
    })
})

describe("fhir resolve dnr from identifier", () => {
    test("with valid single input", () => {
        const expected = "43056078023"
        expect(dnrFromIdentifier(dnrIdentifierInput)).toEqual(expected)
    })
})

describe("fhir resolve fnr or dnr from identifiers", () => {
    test("both dnr and fnr should always return fnr, regardless for order", () => {
        let inp = [dnrIdentifierInput, fnrIdentifierInput]
        expect(fnrFromIdentifiers(inp) || dnrFromIdentifiers(inp)).toEqual(fnrInput)
        inp = [fnrIdentifierInput, dnrIdentifierInput]
        expect(fnrFromIdentifiers(inp) || dnrFromIdentifiers(inp)).toEqual(fnrInput)
    })
})

describe("fhir resolve DipsDepartmentReference from extension(s)", () => {
    const extensionsSample1  = [
        {
            "url": "http://dips.no/fhir/StructureDefinition/R4/DIPSPractitionerRoleHealthCarePartyType",
            "valueString": "Person"
        },
        {
            "url": "http://dips.no/fhir/StructureDefinition/R4/DIPSPractitionerRoleHealthcarePartyDepartment",
            "valueReference": {
                "reference": "Organization/afaDepartment1",
                "identifier": {
                    "use": IdentifierUseKind._official,
                    "system": "urn:oid:1.3.6.1.4.1.9038.70.3",
                    "value": "1"
                }
            }
        },
        {
            "url": "http://dips.no/fhir/StructureDefinition/R4/DIPSPractitionerRoleHospital",
            "valueReference": {
                "reference": "Organization/afm1",
                "identifier": {
                    "use": IdentifierUseKind._official,
                    "system": "urn:oid:2.16.578.1.12.4.1.4.101",
                    "value": "970948139"
                }
            }
        },
        {
            "url": "http://dips.no/fhir/StructureDefinition/R4/DIPSPractitionerRoleUserRoleDepartment",
            "valueReference": {
                "reference": "Organization/afaDepartment2",
                "identifier": {
                    "use": IdentifierUseKind._official,
                    "system": "urn:oid:1.3.6.1.4.1.9038.70.3",
                    "value": "2"
                }
            }
        },
        {
            "url": "http://dips.no/fhir/StructureDefinition/R4/DIPSPractitionerRoleUserRoleLastUpdated",
            "valueDateTime": "2023-09-20T12:40:05+00:00"
        }
    ] satisfies IExtension[]
    test("with non-existing url", () => {
        expect(dipsDepartmentReferenceFromExtensions(extensionsSample1, "http://dips.no/fhir/StructureDefinition/R4/WRONG"))
            .toBeUndefined()
    })
    test("with url matching value other than department reference", () => {
        expect(dipsDepartmentReferenceFromExtensions(extensionsSample1, "http://dips.no/fhir/StructureDefinition/R4/DIPSPractitionerRoleHospital"))
            .toBeUndefined()
    })
    test("with both references in input choose correct one", () => {
        expect(resolveUsersDepartmentReference(extensionsSample1)).toEqual("Organization/afaDepartment2")
    })
    test("with only DIPSPractitionerRoleHealthcarePartyDepartment in input, choose it", () => {
        const input = extensionsSample1.filter(r => !r.url.endsWith("DIPSPractitionerRoleUserRoleDepartment"))
        expect(resolveUsersDepartmentReference(input)).toEqual("Organization/afaDepartment1")
    })
})