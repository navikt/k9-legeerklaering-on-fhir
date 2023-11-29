import { Accordion, Button, Heading, Ingress, List, Modal } from "@navikt/ds-react";
import { tekst } from "@/utils/tekster";
import React from "react";
import LegeerklaeringData from "@/app/components/legeerklaering/LegeerklaeringData";
import { logger } from '@navikt/next-logger';

export interface SummaryModalProps {
    readonly show: boolean;
    readonly onClose: () => void;
    readonly data: LegeerklaeringData | null;
}

const SummaryModal = ({show, onClose, data}: SummaryModalProps) => {

    const downloadBlob = (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'legeerklæring-pleiepenger-sykt-barn.pdf';

        // This is to make the anchor hidden and to append, click, and then immediately remove it
        document.body.appendChild(a).click();

        // Cleanup tasks
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };


    const hentPdfOppsummering = () => {
        console.log("Registrerer");
        fetch(`${window.location.origin}/api/oppsummering/pdf`, {
            method: 'POST',
            body: JSON.stringify(data)
        }).then(async response => {
            if (response.ok) {
                const responseData = await response.blob()
                downloadBlob(responseData);
                logger.info("File downloaded successfully");
            } else {
                logger.error(await response.text(), "Error submitting form data")
            }
        }).catch(error => {
            logger.error(error, "Error submitting form data")
        });
    };

    return data !== null ? (
        <Modal
            open={show}
            onClose={onClose}
            aria-labelledby="SummaryModalHeading"
            header={{heading: "Oppsummering", closeButton: true}}
        >
            <Modal.Body>
                <Accordion>
                    <Accordion.Item defaultOpen>
                        <Accordion.Header>{tekst("legeerklaering.om-barnet.tittel")}</Accordion.Header>
                        <Accordion.Content>
                            <Heading level="5" size="xsmall">{tekst("legeerklaering.felles.navn.label")}</Heading>
                            <Ingress spacing>{data.barn.name}</Ingress>

                            <Heading level="5"
                                     size="xsmall">{tekst("legeerklaering.om-barnet.ident.label")}</Heading>
                            <Ingress spacing>{data.barn.fnr}</Ingress>

                            <Heading level="5"
                                     size="xsmall">{tekst("legeerklaering.om-barnet.foedselsdato.label")}</Heading>
                            <Ingress spacing>{data.barn.birthDate?.toDateString()}</Ingress>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item defaultOpen>
                        <Accordion.Header>{tekst('legeerklaering.legens-vurdering.barn.tittel')}</Accordion.Header>
                        <Accordion.Content>
                            <Heading level="5" size="xsmall">{tekst("legeerklaering.legens-vurdering.barn.label")}</Heading>
                            <Ingress spacing>{data.legensVurdering}</Ingress>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item defaultOpen>
                        <Accordion.Header>{tekst("legeerklaering.diagnose.tittel")}</Accordion.Header>
                        <Accordion.Content>
                            <Heading level="5"
                                     size="xsmall">{tekst("legeerklaering.diagnose.hoveddiagnose.label")}</Heading>
                            <Ingress spacing>{`${data.hoveddiagnose?.code} - ${data.hoveddiagnose?.text}`}</Ingress>

                            <Heading level="5"
                                     size="xsmall">{tekst("legeerklaering.diagnose.bidiagnoser.label")}</Heading>
                            <List>
                                {data.bidiagnoser.map(bidiagnose =>
                                    <List.Item
                                        key={`listbidiag-${bidiagnose.code}`}>{bidiagnose.code} - {bidiagnose.text}</List.Item>
                                )}
                            </List>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item defaultOpen>
                        <Accordion.Header>{tekst("legeerklaering.tilsyn-varighet.tittel")}</Accordion.Header>
                        <Accordion.Content>
                            <Heading level="5" size="xsmall">Perioder</Heading>
                            <List>
                                {
                                    data.tilsynPerioder.map(tilsynsPeriode =>
                                        <List.Item
                                            key={`tilsynp-${tilsynsPeriode.start?.getTime()}-${tilsynsPeriode.end?.getTime()}`}>
                                            {tilsynsPeriode.start?.toLocaleDateString('no-NO')} - {tilsynsPeriode.end?.toLocaleDateString('no-NO')}
                                        </List.Item>
                                    )
                                }
                            </List>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item defaultOpen>
                        <Accordion.Header>{tekst("legeerklaering.innleggelse-varighet.tittel")}</Accordion.Header>
                        <Accordion.Content>
                            <Heading level="5" size="xsmall">Perioder</Heading>
                            <List>
                                {
                                    data.innleggelsesPerioder?.map(innleggelsesPeriode =>
                                        <List.Item
                                            key={`innleggp-${innleggelsesPeriode.start?.getTime()}-${innleggelsesPeriode.end?.getTime()}`}>
                                            {innleggelsesPeriode.start?.toLocaleDateString('no-NO')} - {innleggelsesPeriode.end?.toLocaleDateString('no-NO')}
                                        </List.Item>
                                    )
                                }
                            </List>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item defaultOpen>
                        <Accordion.Header>{tekst("legeerklaering.om-legen.tittel")}</Accordion.Header>
                        <Accordion.Content>
                            <Heading level="5" size="xsmall">{tekst("legeerklaering.felles.navn.label")}</Heading>
                            <Ingress spacing>{data.lege.name}</Ingress>

                            <Heading level="5"
                                     size="xsmall">{tekst("legeerklaering.om-legen.hpr-nummer.label")}</Heading>
                            <Ingress spacing>{data.lege.hprNumber}</Ingress>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item defaultOpen>
                        <Accordion.Header>{tekst("legeerklaering.om-sykehuset.tittel")}</Accordion.Header>
                        <Accordion.Content>
                            <Heading level="5" size="xsmall">{tekst("legeerklaering.felles.navn.label")}</Heading>
                            <Ingress spacing>{data.sykehus.name}</Ingress>

                            <Heading level="5"
                                     size="xsmall">{tekst("legeerklaering.om-sykehuset.tlf.label")}</Heading>
                            <Ingress spacing>{data.sykehus.phoneNumber}</Ingress>

                            <Heading level="5" size="xsmall">
                                {tekst("legeerklaering.om-sykehuset.gateadresse.label")}
                            </Heading>
                            <Ingress spacing>{data.sykehus.address?.line1}</Ingress>
                            <Ingress spacing>{data.sykehus.address?.line2}</Ingress>

                            <Heading level="5"
                                     size="xsmall">{tekst("legeerklaering.om-sykehuset.postnummer.label")}</Heading>
                            <Ingress spacing>{data.sykehus.address?.postalCode}</Ingress>

                            <Heading level="5"
                                     size="xsmall">{tekst("legeerklaering.om-sykehuset.poststed.label")}</Heading>
                            <Ingress spacing>{data.sykehus.address?.city}</Ingress>
                        </Accordion.Content>
                    </Accordion.Item>
                </Accordion>
            </Modal.Body>
            <Modal.Footer>
                <div className="ml-4 mt-4 mb-16">
                    <Button type="submit" onClick={hentPdfOppsummering}>Alt ser bra ut. Send inn</Button>
                </div>
            </Modal.Footer>
        </Modal>
    ) : null;
}

export default SummaryModal;
