/* global api */
class encn_Cambridge_tc {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    // [Previous methods remain the same until findCambridge]

    async findCambridge(word) {
        let notes = [];
        if (!word) return notes;

        function T(node) {
            if (!node) return '';
            else return node.innerText.trim();
        }

        let base = 'https://dictionary.cambridge.org/search/english-chinese-traditional/direct/?q=';
        let url = base + encodeURIComponent(word);
        let doc = '';
        try {
            let data = await api.fetch(url);
            let parser = new DOMParser();
            doc = parser.parseFromString(data, 'text/html');
        } catch (err) {
            return [];
        }

        // Group definitions by part of speech
        let posGroups = new Map();
        
        let entries = doc.querySelectorAll('.pr .entry-body__el') || [];
        for (const entry of entries) {
            let expression = T(entry.querySelector('.headword'));
            let readings = entry.querySelectorAll('.pron .ipa');
            let reading = '';
            if (readings) {
                let reading_uk = T(readings[0]);
                let reading_us = T(readings[1]);
                reading = (reading_uk || reading_us) ? `UK[${reading_uk}] US[${reading_us}]` : '';
            }

            let pos = T(entry.querySelector('.posgram'));
            if (!pos) pos = 'other';

            let audios = [];
            audios[0] = entry.querySelector(".uk.dpron-i source");
            audios[0] = audios[0] ? 'https://dictionary.cambridge.org' + audios[0].getAttribute('src') : '';
            audios[1] = entry.querySelector(".us.dpron-i source");
            audios[1] = audios[1] ? 'https://dictionary.cambridge.org' + audios[1].getAttribute('src') : '';

            if (!posGroups.has(pos)) {
                posGroups.set(pos, {
                    expression,
                    reading,
                    definitions: [],
                    audios
                });
            }

            let sensbodys = entry.querySelectorAll('.sense-body') || [];
            for (const sensbody of sensbodys) {
                let sensblocks = sensbody.childNodes || [];
                for (const sensblock of sensblocks) {
                    let phrasehead = '';
                    let defblocks = [];
                    if (sensblock.classList && sensblock.classList.contains('phrase-block')) {
                        phrasehead = T(sensblock.querySelector('.phrase-title'));
                        phrasehead = phrasehead ? `<div class="phrasehead">${phrasehead}</div>` : '';
                        defblocks = sensblock.querySelectorAll('.def-block') || [];
                    }
                    if (sensblock.classList && sensblock.classList.contains('def-block')) {
                        defblocks = [sensblock];
                    }
                    if (defblocks.length <= 0) continue;

                    for (const defblock of defblocks) {
                        let eng_tran = T(defblock.querySelector('.ddef_h .def'));
                        let chn_tran = T(defblock.querySelector('.def-body .trans'));
                        if (!eng_tran) continue;

                        let definition = '';
                        eng_tran = `<span class='eng_tran'>${eng_tran.replace(RegExp(expression, 'gi'),`<b>${expression}</b>`)}</span>`;
                        chn_tran = `<span class='chn_tran'>${chn_tran}</span>`;
                        definition += `<div class="definition">${eng_tran}${chn_tran}</div>`;

                        let examps = defblock.querySelectorAll('.def-body .examp') || [];
                        if (examps.length > 0 && this.maxexample > 0) {
                            definition += '<ul class="sents">';
                            for (const [index, examp] of examps.entries()) {
                                if (index > this.maxexample - 1) break;
                                let eng_examp = T(examp.querySelector('.eg'));
                                let chn_examp = T(examp.querySelector('.trans'));
                                definition += `<li class='sent'><span class='eng_sent'>${eng_examp.replace(RegExp(expression, 'gi'),`<b>${expression}</b>`)}</span><span class='chn_sent'>${chn_examp}</span></li>`;
                            }
                            definition += '</ul>';
                        }
                        posGroups.get(pos).definitions.push(definition);
                    }
                }
            }
        }

        // Create final note with grouped definitions
        if (posGroups.size > 0) {
            let css = this.renderCSS();
            let firstGroup = posGroups.values().next().value;
            let note = {
                css,
                expression: firstGroup.expression,
                reading: '',
                definitions: [],
                audios: firstGroup.audios
            };

            for (let [pos, group] of posGroups) {
                let posHeader = `<div class="pos-header">(${pos})</div>`;
                let posReading = `<div class="reading">${group.reading}</div>`;
                note.definitions.push(posHeader);
                note.definitions.push(posReading);
                note.definitions.push(...group.definitions);
            }

            notes.push(note);
        }

        return notes;
    }

    renderCSS() {
        let css = `
            <style>
                .pos-header {
                    font-weight: bold;
                    margin-top: 10px;
                    color: #0d47a1;
                }
                .reading {
                    color: #666;
                    margin-bottom: 5px;
                }
                .definition {
                    margin-left: 15px;
                    margin-bottom: 5px;
                }
                span.eng_tran {margin-right:3px; padding:0;}
                span.chn_tran {color:#0d47a1;}
                ul.sents {
                    font-size:0.9em;
                    list-style:square inside;
                    margin:3px 0;
                    padding:5px;
                    background:rgba(13,71,161,0.1);
                    border-radius:5px;
                    margin-left: 30px;
                }
                li.sent  {margin:0; padding:0;}
                span.eng_sent {margin-right:5px;}
                span.chn_sent {color:#0d47a1;}
            </style>`;
        return css;
    }

    // [Other methods remain the same]
}
