import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

const BudgetPlannerMultiAula = () => {
  const [progetto, setProgetto] = useState({ nome: '', descrizione: '', dataCreazione: new Date().toISOString() });
  const [aule, setAule] = useState([
    { id: 1, nome: 'Aula 1', numeroAllievi: 0, oreTotaliCorso: 0, ucsApplicata: 0, attiva: true, colore: '#2563eb' },
    { id: 2, nome: 'Aula 2', numeroAllievi: 0, oreTotaliCorso: 0, ucsApplicata: 0, attiva: true, colore: '#7c3aed' }
  ]);
  const [gestioneCosti, setGestioneCosti] = useState([]);
  const [realizzazioneCosti, setRealizzazioneCosti] = useState([]);
  const [docenzeCosti, setDocenzeCosti] = useState([]);
  const [commerciale, setCommerciale] = useState({
    feePartner1: { percentuale: 0, note: 'Sul ricavo totale' },
    feePartner2: { percentuale: 0, note: 'Sul ricavo totale' }
  });
  const [note, setNote] = useState([]);
  const [mostraModalNote, setMostraModalNote] = useState(false);
  const [nuovaNota, setNuovaNota] = useState('');
  const [mostraModalCarica, setMostraModalCarica] = useState(false);
  const [mostraAdmin, setMostraAdmin] = useState(false);
  const [mostraConfigAule, setMostraConfigAule] = useState(false);
  const [mostraModalPDF, setMostraModalPDF] = useState(false);
  const [sezioniPDF, setSezioniPDF] = useState({
    intestazione: true,
    riepilogoGlobale: true,
    incidenze: true,
    margine: true,
    configAule: true,
    feeCommerciali: true,
    dettaglioGestione: true,
    dettaglioRealizzazione: true,
    dettaglioDocenze: true,
    confrontoAule: true,
    note: true,
  });
  const [preventivi, setPreventivi] = useState([]);
  const [messaggioStato, setMessaggioStato] = useState('Pronto per iniziare.');
  const [ricercaPreventivo, setRicercaPreventivo] = useState('');
  const [tabAttiva, setTabAttiva] = useState('riepilogo');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPreventivoId, setCurrentPreventivoId] = useState(null);

  const coloriDisponibili = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2', '#65a30d'];

  // ============ SUPABASE FUNCTIONS ============

  // Carica lista preventivi da Supabase
  const caricaListaPreventivi = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('preventivi')
        .select('id, nome, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPreventivi(data || []);
    } catch (error) {
      console.error('Errore caricamento lista:', error);
      setMessaggioStato('⚠️ Errore connessione database');
    }
  }, []);

  // Salva preventivo su Supabase
  const salvaPreventivo = useCallback(async () => {
    if (!progetto.nome) {
      setMessaggioStato('⚠️ Inserisci un nome progetto.');
      return;
    }

    setIsLoading(true);
    const datiPreventivo = {
      progetto,
      aule,
      gestioneCosti,
      realizzazioneCosti,
      docenzeCosti,
      commerciale,
      note
    };

    try {
      if (currentPreventivoId) {
        // Aggiorna preventivo esistente
        const { error } = await supabase
          .from('preventivi')
          .update({
            nome: progetto.nome,
            dati: datiPreventivo,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentPreventivoId);

        if (error) throw error;
      } else {
        // Crea nuovo preventivo
        const { data, error } = await supabase
          .from('preventivi')
          .upsert({
            nome: progetto.nome,
            dati: datiPreventivo,
            updated_at: new Date().toISOString()
          }, { onConflict: 'nome' })
          .select()
          .single();

        if (error) throw error;
        if (data) setCurrentPreventivoId(data.id);
      }

      setMessaggioStato('✅ Salvato su cloud.');
      caricaListaPreventivi();
    } catch (error) {
      console.error('Errore salvataggio:', error);
      setMessaggioStato('⚠️ Errore salvataggio: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [progetto, aule, gestioneCosti, realizzazioneCosti, docenzeCosti, commerciale, note, currentPreventivoId, caricaListaPreventivi]);

  // Carica un preventivo specifico da Supabase
  const caricaPreventivo = async (id) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('preventivi')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data && data.dati) {
        const d = data.dati;
        setProgetto(d.progetto || { nome: data.nome, descrizione: '', dataCreazione: data.created_at });
        setAule(d.aule || [{ id: 1, nome: 'Aula 1', numeroAllievi: 0, oreTotaliCorso: 0, ucsApplicata: 0, attiva: true, colore: '#2563eb' }]);
        setGestioneCosti(d.gestioneCosti || []);
        setRealizzazioneCosti(d.realizzazioneCosti || []);
        setDocenzeCosti(d.docenzeCosti || []);
        setCommerciale(d.commerciale || { feePartner1: { percentuale: 0, note: '' }, feePartner2: { percentuale: 0, note: '' } });
        setNote(d.note || []);
        setCurrentPreventivoId(data.id);
        setMostraModalCarica(false);
        setMessaggioStato('✅ "' + data.nome + '" caricato.');
      }
    } catch (error) {
      console.error('Errore caricamento:', error);
      setMessaggioStato('⚠️ Errore caricamento: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Elimina preventivo da Supabase
  const eliminaPreventivo = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo preventivo?')) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('preventivi')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessaggioStato('✅ Preventivo eliminato.');
      caricaListaPreventivi();

      if (currentPreventivoId === id) {
        nuovoPreventivo();
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      setMessaggioStato('⚠️ Errore eliminazione: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ============ CALCOLI ============

  const calcolaRicavoAula = (aula) => aula.numeroAllievi * aula.oreTotaliCorso * aula.ucsApplicata;

  // Calcoli globali (definiti prima di calcolaCostiAula che li usa)
  const ricavoTotale = aule.filter(a => a.attiva).reduce((acc, aula) => acc + calcolaRicavoAula(aula), 0);
  // Quando una voce è assegnata a più aule, le ore/quantità si moltiplicano per il numero di aule
  const totaleGestione = gestioneCosti.reduce((acc, item) => acc + (item.costoUnitario * item.quantita * item.auleAssegnate.length), 0);
  const totaleRealizzazione = realizzazioneCosti.reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0);
  const totaleDocenze = docenzeCosti.reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0);
  const feePartner1Calc = ricavoTotale * (commerciale.feePartner1.percentuale / 100);
  const feePartner2Calc = ricavoTotale * (commerciale.feePartner2.percentuale / 100);

  const calcolaCostiAula = (aulaId) => {
    // Ogni aula prende il costo pieno della voce (non diviso)
    const gestioneAula = gestioneCosti.filter(item => item.auleAssegnate.includes(aulaId)).reduce((acc, item) => {
      return acc + (item.costoUnitario * item.quantita);
    }, 0);
    const realizzazioneAula = realizzazioneCosti.filter(item => item.auleAssegnate.includes(aulaId)).reduce((acc, item) => {
      return acc + (item.tariffaOraria * item.ore);
    }, 0);
    const docenzeAula = docenzeCosti.filter(item => item.auleAssegnate.includes(aulaId)).reduce((acc, item) => {
      return acc + (item.tariffaOraria * item.ore);
    }, 0);
    const aula = aule.find(a => a.id === aulaId);
    const ricavoAula = aula ? calcolaRicavoAula(aula) : 0;
    // Le fee commerciali per aula sono proporzionali al peso del ricavo dell'aula sul totale
    const pesoAula = ricavoTotale > 0 ? ricavoAula / ricavoTotale : 0;
    const feeP1 = feePartner1Calc * pesoAula;
    const feeP2 = feePartner2Calc * pesoAula;

    // Costo Partner 1 per aula: attività realizzazione marcate P1 + docenze marcate P1 + fee Partner 1
    const realizzazioneP1Aula = realizzazioneCosti.filter(item => item.partner1 && item.auleAssegnate.includes(aulaId)).reduce((acc, item) => {
      return acc + (item.tariffaOraria * item.ore);
    }, 0);
    const docenzeP1Aula = docenzeCosti.filter(item => item.partner1 && item.auleAssegnate.includes(aulaId)).reduce((acc, item) => {
      return acc + (item.tariffaOraria * item.ore);
    }, 0);
    const costoP1Aula = realizzazioneP1Aula + docenzeP1Aula + feeP1;

    // Costo Partner 2 per aula: docenze marcate P2 + fee Partner 2
    const docenzeP2Aula = docenzeCosti.filter(item => item.partner2 && item.auleAssegnate.includes(aulaId)).reduce((acc, item) => {
      return acc + (item.tariffaOraria * item.ore);
    }, 0);
    const costoP2Aula = docenzeP2Aula + feeP2;

    // Guadagno Azienda per aula: attività marcate Azienda
    const realizzazioneAzAula = realizzazioneCosti.filter(item => item.azienda && item.auleAssegnate.includes(aulaId)).reduce((acc, item) => {
      return acc + (item.tariffaOraria * item.ore);
    }, 0);
    const docenzeAzAula = docenzeCosti.filter(item => item.azienda && item.auleAssegnate.includes(aulaId)).reduce((acc, item) => {
      return acc + (item.tariffaOraria * item.ore);
    }, 0);
    const guadagnoAzAula = realizzazioneAzAula + docenzeAzAula;

    // Righe marcate sia P1 che Az: pesano doppio sul costo aula
    const doppioP1AzAula = realizzazioneCosti.filter(item => item.partner1 && item.azienda && item.auleAssegnate.includes(aulaId)).reduce((acc, item) => acc + (item.tariffaOraria * item.ore), 0) + docenzeCosti.filter(item => item.partner1 && item.azienda && item.auleAssegnate.includes(aulaId)).reduce((acc, item) => acc + (item.tariffaOraria * item.ore), 0);

    // Altri Costi per aula: gestione + realizzazione non P1 non Az + docenze non P2 non P1 non Az
    const realizzazioneAltriAula = realizzazioneCosti.filter(item => !item.partner1 && !item.azienda && item.auleAssegnate.includes(aulaId)).reduce((acc, item) => {
      return acc + (item.tariffaOraria * item.ore);
    }, 0);
    const docenzeAltriAula = docenzeCosti.filter(item => !item.partner2 && !item.partner1 && !item.azienda && item.auleAssegnate.includes(aulaId)).reduce((acc, item) => {
      return acc + (item.tariffaOraria * item.ore);
    }, 0);
    const altriCostiAula = gestioneAula + realizzazioneAltriAula + docenzeAltriAula;

    return {
      gestione: gestioneAula,
      realizzazione: realizzazioneAula,
      docenze: docenzeAula,
      feePartner1: feeP1,
      feePartner2: feeP2,
      costoPartner1: costoP1Aula,
      costoPartner2: costoP2Aula,
      guadagnoAzienda: guadagnoAzAula,
      altriCosti: altriCostiAula,
      totale: gestioneAula + realizzazioneAula + docenzeAula + feeP1 + feeP2 + doppioP1AzAula
    };
  };
  const totaleCommerciale = feePartner1Calc + feePartner2Calc;
  // I costi si moltiplicano per il numero di aule assegnate
  const costoPartner1 = realizzazioneCosti.filter(item => item.partner1).reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0) + docenzeCosti.filter(item => item.partner1).reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0) + feePartner1Calc;
  const costoPartner2 = docenzeCosti.filter(item => item.partner2).reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0) + feePartner2Calc;
  const guadagnoAzienda = realizzazioneCosti.filter(item => item.azienda).reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0) + docenzeCosti.filter(item => item.azienda).reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0);
  // Quando una riga è marcata sia P1 che Az, il suo importo pesa doppio sul progetto (una volta P1, una volta Az)
  const doppioP1Az = realizzazioneCosti.filter(item => item.partner1 && item.azienda).reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0) + docenzeCosti.filter(item => item.partner1 && item.azienda).reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0);
  const costoTotaleProgetto = totaleGestione + totaleRealizzazione + totaleDocenze + totaleCommerciale + doppioP1Az;
  const altriCosti = totaleGestione + realizzazioneCosti.filter(item => !item.partner1 && !item.azienda).reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0) + docenzeCosti.filter(item => !item.partner2 && !item.partner1 && !item.azienda).reduce((acc, item) => acc + (item.tariffaOraria * item.ore * item.auleAssegnate.length), 0);
  const margine = ricavoTotale - costoTotaleProgetto + guadagnoAzienda;
  const incidenzaPartner1 = ricavoTotale > 0 ? (costoPartner1 / ricavoTotale) * 100 : 0;
  const incidenzaPartner2 = ricavoTotale > 0 ? (costoPartner2 / ricavoTotale) * 100 : 0;
  const incidenzaAltriCosti = ricavoTotale > 0 ? (altriCosti / ricavoTotale) * 100 : 0;
  const incidenzaAzienda = ricavoTotale > 0 ? (margine / ricavoTotale) * 100 : 0;

  // ============ GESTIONE AULE ============

  const aggiungiAula = () => {
    const nuovoId = Math.max(...aule.map(a => a.id), 0) + 1;
    setAule([...aule, { id: nuovoId, nome: `Aula ${nuovoId}`, numeroAllievi: 0, oreTotaliCorso: 0, ucsApplicata: 0, attiva: true, colore: coloriDisponibili[aule.length % coloriDisponibili.length] }]);
  };

  const rimuoviAula = (id) => {
    if (aule.length <= 1) { setMessaggioStato('⚠️ Devi mantenere almeno un\'aula.'); return; }
    setAule(aule.filter(a => a.id !== id));
    setGestioneCosti(gestioneCosti.map(item => ({ ...item, auleAssegnate: item.auleAssegnate.filter(aId => aId !== id) })));
    setRealizzazioneCosti(realizzazioneCosti.map(item => ({ ...item, auleAssegnate: item.auleAssegnate.filter(aId => aId !== id) })));
    setDocenzeCosti(docenzeCosti.map(item => ({ ...item, auleAssegnate: item.auleAssegnate.filter(aId => aId !== id) })));
  };

  const aggiornaAula = (id, campo, valore) => setAule(aule.map(a => a.id === id ? { ...a, [campo]: valore } : a));

  // ============ GESTIONE RIGHE COSTI ============

  const aggiungiRigaGestione = () => setGestioneCosti([...gestioneCosti, { id: Date.now(), voce: 'Nuova Voce', costoUnitario: 0, quantita: 1, note: '', auleAssegnate: aule.map(a => a.id) }]);
  const aggiungiRigaRealizzazione = () => setRealizzazioneCosti([...realizzazioneCosti, { id: Date.now(), voce: 'Nuova Attività', tariffaOraria: 0, ore: 0, partner1: false, azienda: false, auleAssegnate: aule.map(a => a.id) }]);
  const aggiungiRigaDocenze = () => setDocenzeCosti([...docenzeCosti, { id: Date.now(), docente: 'Nuovo Docente', tariffaOraria: 0, ore: 0, partner1: false, partner2: false, azienda: false, auleAssegnate: aule.map(a => a.id) }]);
  const rimuoviRigaGestione = (id) => setGestioneCosti(gestioneCosti.filter(item => item.id !== id));
  const rimuoviRigaRealizzazione = (id) => setRealizzazioneCosti(realizzazioneCosti.filter(item => item.id !== id));
  const rimuoviRigaDocenze = (id) => setDocenzeCosti(docenzeCosti.filter(item => item.id !== id));
  const aggiornaGestione = (id, campo, valore) => setGestioneCosti(gestioneCosti.map(item => item.id === id ? { ...item, [campo]: valore } : item));
  const aggiornaRealizzazione = (id, campo, valore) => setRealizzazioneCosti(realizzazioneCosti.map(item => item.id === id ? { ...item, [campo]: valore } : item));
  const aggiornaDocenze = (id, campo, valore) => setDocenzeCosti(docenzeCosti.map(item => item.id === id ? { ...item, [campo]: valore } : item));

  const toggleAulaAssegnata = (itemId, aulaId, tipo) => {
    const updateFn = (items) => items.map(item => {
      if (item.id === itemId) {
        const nuoveAule = item.auleAssegnate.includes(aulaId) ? item.auleAssegnate.filter(id => id !== aulaId) : [...item.auleAssegnate, aulaId];
        return { ...item, auleAssegnate: nuoveAule };
      }
      return item;
    });
    if (tipo === 'gestione') setGestioneCosti(updateFn(gestioneCosti));
    if (tipo === 'realizzazione') setRealizzazioneCosti(updateFn(realizzazioneCosti));
    if (tipo === 'docenze') setDocenzeCosti(updateFn(docenzeCosti));
  };

  // ============ ALTRE FUNZIONI ============

  const nuovoPreventivo = () => {
    setProgetto({ nome: '', descrizione: '', dataCreazione: new Date().toISOString() });
    setAule([{ id: 1, nome: 'Aula 1', numeroAllievi: 0, oreTotaliCorso: 0, ucsApplicata: 0, attiva: true, colore: '#2563eb' }, { id: 2, nome: 'Aula 2', numeroAllievi: 0, oreTotaliCorso: 0, ucsApplicata: 0, attiva: true, colore: '#7c3aed' }]);
    setGestioneCosti([]); setRealizzazioneCosti([]); setDocenzeCosti([]);
    setCommerciale({ feePartner1: { percentuale: 0, note: 'Sul ricavo totale' }, feePartner2: { percentuale: 0, note: 'Sul ricavo totale' } });
    setNote([]);
    setCurrentPreventivoId(null);
    setMessaggioStato('Pronto.');
  };

  const aggiungiNota = () => {
    if (nuovaNota.trim()) {
      setNote([...note, { id: Date.now(), testo: nuovaNota, data: new Date().toLocaleString() }]);
      setNuovaNota('');
      setMostraModalNote(false);
    }
  };

  const salvaPDF = () => {
    setMostraModalPDF(true);
  };

  const eseguiStampaPDF = () => {
    setMostraModalPDF(false);
    setTimeout(() => window.print(), 100);
  };

  const toggleSezionePDF = (chiave) => {
    setSezioniPDF(prev => ({ ...prev, [chiave]: !prev[chiave] }));
  };

  const selezionaTutteSezioniPDF = (valore) => {
    setSezioniPDF({
      intestazione: valore,
      riepilogoGlobale: valore,
      incidenze: valore,
      margine: valore,
      configAule: valore,
      feeCommerciali: valore,
      dettaglioGestione: valore,
      dettaglioRealizzazione: valore,
      dettaglioDocenze: valore,
      confrontoAule: valore,
      note: valore,
    });
  };

  // ============ EFFECTS ============

  useEffect(() => {
    caricaListaPreventivi();
  }, [caricaListaPreventivi]);

  // Auto-save con debounce
  useEffect(() => {
    if (!progetto.nome) return;

    const timer = setTimeout(() => {
      salvaPreventivo();
    }, 3000);

    return () => clearTimeout(timer);
  }, [progetto, aule, gestioneCosti, realizzazioneCosti, docenzeCosti, commerciale, note]);

  // ============ FORMATTING ============

  const formatCurrency = (v) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
  const formatPercentage = (v) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' %';
  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ============ COMPONENTS ============

  const BadgeAula = ({ aula }) => (<span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', background: aula.colore + '15', color: aula.colore, borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid ' + aula.colore + '30' }}>{aula.nome}</span>);

  const CheckboxAula = ({ aula, checked, onChange }) => (<label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', background: checked ? aula.colore + '10' : 'transparent', border: '1px solid ' + (checked ? aula.colore : '#e2e8f0'), transition: 'all 0.2s' }}><input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} /><span style={{ width: '16px', height: '16px', borderRadius: '4px', background: checked ? aula.colore : 'white', border: '2px solid ' + (checked ? aula.colore : '#cbd5e1'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>{checked && '✓'}</span><span style={{ fontSize: '12px', color: checked ? aula.colore : '#64748b', fontWeight: '500' }}>{aula.nome}</span></label>);

  const LoadingSpinner = () => (<span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />);

  const inputStyle = { width: '100%', padding: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', boxSizing: 'border-box', fontSize: '14px' };
  const btnStyle = { padding: '10px 20px', background: 'linear-gradient(135deg, #059669, #047857)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: 'white', fontWeight: '600', fontSize: '13px' };

  return (
    <>
    <div className="app-shell" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .print-area { display: none; }
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: white !important; }
          .app-shell { display: none !important; }
          .print-area { display: block !important; }
          .pdf-page { page-break-after: always; }
          .pdf-page:last-child { page-break-after: auto; }
          .pdf-avoid-break { page-break-inside: avoid; }
        }
      `}</style>

      <header style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px 32px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>Budget Planner Multi-Aula</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Gestione progetti formativi con edizioni multiple • <span style={{ color: '#2563eb' }}>☁️ Supabase</span></p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setMostraModalCarica(true)} style={{ padding: '10px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', color: '#475569', fontWeight: '500', fontSize: '13px' }}>📂 Carica</button>
            <button onClick={() => setMostraModalNote(true)} style={{ padding: '10px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', color: '#475569', fontWeight: '500', fontSize: '13px' }}>📝 Note</button>
            <button onClick={() => setMostraConfigAule(true)} style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: 'white', fontWeight: '600', fontSize: '13px' }}>🏫 Aule ({aule.length})</button>
            <button onClick={salvaPreventivo} disabled={isLoading} style={{ ...btnStyle, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', opacity: isLoading ? 0.7 : 1 }}>{isLoading ? <LoadingSpinner /> : '💾 Salva'}</button>
            <button onClick={salvaPDF} className="no-print" style={{ ...btnStyle, background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>📄 Salva PDF</button>
            <button onClick={nuovoPreventivo} style={btnStyle}>➕ Nuovo</button>
          </div>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: messaggioStato.includes('✅') ? '#059669' : messaggioStato.includes('⚠️') ? '#d97706' : '#64748b' }}>{isLoading && <LoadingSpinner />} {messaggioStato}</span>
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>{aule.filter(a => a.attiva).map(aula => <BadgeAula key={aula.id} aula={aula} />)}</div>
        </div>
      </header>

      <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'white', padding: '6px', borderRadius: '14px', width: 'fit-content', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {[{ id: 'riepilogo', label: '📊 Riepilogo' }, { id: 'input', label: '📝 Dati Input' }, { id: 'costi', label: '💰 Costi' }, { id: 'confronto', label: '⚖️ Confronto' }].map(tab => (
            <button key={tab.id} onClick={() => setTabAttiva(tab.id)} style={{ padding: '10px 20px', background: tabAttiva === tab.id ? '#f1f5f9' : 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', color: tabAttiva === tab.id ? '#1e293b' : '#64748b', fontWeight: '500', fontSize: '14px' }}>{tab.label}</button>
          ))}
        </div>

        {tabAttiva === 'riepilogo' && (
          <div>
            <section style={{ background: 'white', borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Riepilogo Finanziario Globale</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '20px', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: '16px', border: '1px solid #a7f3d0' }}><div style={{ fontSize: '12px', color: '#047857', fontWeight: '500' }}>A. Ricavo Totale</div><div style={{ fontSize: '28px', fontWeight: '700', color: '#059669' }}>{formatCurrency(ricavoTotale)}</div></div>
                <div style={{ padding: '20px', background: 'linear-gradient(135deg, #fef2f2, #fecaca)', borderRadius: '16px', border: '1px solid #fca5a5' }}><div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '500' }}>B. Costo Totale</div><div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>{formatCurrency(costoTotaleProgetto)}</div></div>
                <div style={{ padding: '20px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: '16px', border: '1px solid #93c5fd' }}><div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: '500' }}>C. Costo Partner 1</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>{formatCurrency(costoPartner1)}</div></div>
                <div style={{ padding: '20px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: '16px', border: '1px solid #c4b5fd' }}><div style={{ fontSize: '12px', color: '#6d28d9', fontWeight: '500' }}>D. Costo Partner 2</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>{formatCurrency(costoPartner2)}</div></div>
                <div style={{ padding: '20px', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '16px', border: '1px solid #fcd34d' }}><div style={{ fontSize: '12px', color: '#b45309', fontWeight: '500' }}>E. Guadagno Azienda</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706' }}>{formatCurrency(guadagnoAzienda)}</div></div>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}><div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>F. Altri Costi</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#475569' }}>{formatCurrency(altriCosti)}</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[{ label: 'Inc. Partner 1', value: incidenzaPartner1, color: '#2563eb' }, { label: 'Inc. Partner 2', value: incidenzaPartner2, color: '#7c3aed' }, { label: 'Inc. Altri Costi', value: incidenzaAltriCosti, color: '#475569' }, { label: 'Inc. Azienda', value: incidenzaAzienda, color: '#d97706' }].map((item, i) => (
                  <div key={i} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#64748b' }}>{item.label}</div><div style={{ fontSize: '20px', fontWeight: '700', color: item.color }}>{formatPercentage(item.value)}</div></div>
                ))}
              </div>
              <div style={{ padding: '28px', background: margine >= 0 ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #fef2f2, #fecaca)', borderRadius: '16px', textAlign: 'center', border: '1px solid ' + (margine >= 0 ? '#a7f3d0' : '#fca5a5') }}>
                <div style={{ fontSize: '14px', color: margine >= 0 ? '#047857' : '#b91c1c', fontWeight: '600', marginBottom: '8px' }}>MARGINE TOTALE</div>
                <div style={{ fontSize: '42px', fontWeight: '800', color: margine >= 0 ? '#059669' : '#dc2626', marginBottom: '16px' }}>{formatCurrency(margine)}</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '13px', color: margine >= 0 ? '#047857' : '#b91c1c', background: 'rgba(255,255,255,0.5)', padding: '12px 16px', borderRadius: '10px' }}>
                  <span>= A. Ricavo Totale</span>
                  <span style={{ fontWeight: '700' }}>({formatCurrency(ricavoTotale)})</span>
                  <span>−</span>
                  <span>B. Costo Totale</span>
                  <span style={{ fontWeight: '700' }}>({formatCurrency(costoTotaleProgetto)})</span>
                  <span>+</span>
                  <span>E. Guadagno Azienda</span>
                  <span style={{ fontWeight: '700' }}>({formatCurrency(guadagnoAzienda)})</span>
                </div>
                <div style={{ fontSize: '11px', color: margine >= 0 ? '#059669' : '#dc2626', marginTop: '10px', opacity: 0.8, fontStyle: 'italic' }}>
                  Il Guadagno Azienda deriva dalle voci in "Costi → Realizzazione" e "Costi → Docenze" con checkbox "Az" attivo
                </div>
              </div>
            </section>
            <section style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Riepilogo per Aula</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {aule.filter(a => a.attiva).map(aula => {
                  const ricavo = calcolaRicavoAula(aula); const costi = calcolaCostiAula(aula.id); const margineAula = ricavo - costi.totale; return (
                    <div key={aula.id} style={{ padding: '24px', background: '#fafafa', borderRadius: '16px', border: '2px solid ' + aula.colore + '30' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: aula.colore }}>{aula.nome}</h3><span style={{ padding: '4px 12px', background: aula.colore, color: 'white', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{aula.numeroAllievi} allievi • {aula.oreTotaliCorso}h</span></div>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0' }}><span style={{ color: '#64748b' }}>Ricavo</span><span style={{ fontWeight: '600', color: '#059669' }}>{formatCurrency(ricavo)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0' }}><span style={{ color: '#64748b' }}>Costi</span><span style={{ fontWeight: '600', color: '#dc2626' }}>{formatCurrency(costi.totale)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: margineAula >= 0 ? '#ecfdf5' : '#fef2f2', borderRadius: '10px', border: '1px solid ' + (margineAula >= 0 ? '#a7f3d0' : '#fca5a5') }}><span style={{ fontWeight: '600', color: '#1e293b' }}>Margine</span><span style={{ fontWeight: '700', fontSize: '18px', color: margineAula >= 0 ? '#059669' : '#dc2626' }}>{formatCurrency(margineAula)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {tabAttiva === 'input' && (
          <div>
            <section style={{ background: 'white', borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Dati Progetto</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#475569', fontSize: '13px' }}>Nome Progetto *</label><input type="text" value={progetto.nome} onChange={(e) => setProgetto({ ...progetto, nome: e.target.value })} style={inputStyle} placeholder="es. Progetto Formazione 2024" /></div>
                <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#475569', fontSize: '13px' }}>Descrizione</label><input type="text" value={progetto.descrizione} onChange={(e) => setProgetto({ ...progetto, descrizione: e.target.value })} style={inputStyle} placeholder="Descrizione" /></div>
              </div>
            </section>
            <section style={{ background: 'white', borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}><h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Configurazione Aule</h2><button onClick={aggiungiAula} style={btnStyle}>+ Aggiungi Aula</button></div>
              <div style={{ display: 'grid', gap: '16px' }}>
                {aule.map((aula) => (
                  <div key={aula.id} style={{ padding: '24px', background: '#fafafa', borderRadius: '16px', border: '2px solid ' + aula.colore + '30' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="color" value={aula.colore} onChange={(e) => aggiornaAula(aula.id, 'colore', e.target.value)} style={{ width: '36px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
                        <input type="text" value={aula.nome} onChange={(e) => aggiornaAula(aula.id, 'nome', e.target.value)} style={{ ...inputStyle, width: '200px', color: aula.colore, fontWeight: '600' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={aula.attiva} onChange={(e) => aggiornaAula(aula.id, 'attiva', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: aula.colore }} /><span style={{ fontSize: '13px', color: '#64748b' }}>Attiva</span></label>
                        {aule.length > 1 && <button onClick={() => rimuoviAula(aula.id)} style={{ padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                      <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#64748b' }}>Numero Allievi</label><input type="number" value={aula.numeroAllievi || ''} onChange={(e) => aggiornaAula(aula.id, 'numeroAllievi', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                      <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#64748b' }}>Ore Totali</label><input type="number" value={aula.oreTotaliCorso || ''} onChange={(e) => aggiornaAula(aula.id, 'oreTotaliCorso', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                      <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#64748b' }}>UCS (€)</label><input type="number" step="0.01" value={aula.ucsApplicata || ''} onChange={(e) => aggiornaAula(aula.id, 'ucsApplicata', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}><div style={{ padding: '12px', background: aula.colore + '15', borderRadius: '10px', width: '100%', textAlign: 'center', border: '1px solid ' + aula.colore + '30' }}><div style={{ fontSize: '11px', color: '#64748b' }}>Ricavo</div><div style={{ fontSize: '18px', fontWeight: '700', color: aula.colore }}>{formatCurrency(calcolaRicavoAula(aula))}</div></div></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Fee Commerciali</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ padding: '20px', background: '#eff6ff', borderRadius: '16px', border: '1px solid #93c5fd' }}><h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#2563eb' }}>Fee Partner 1</h3><div><label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#64748b' }}>% sul ricavo</label><input type="number" step="0.01" value={commerciale.feePartner1.percentuale || ''} onChange={(e) => setCommerciale({ ...commerciale, feePartner1: { ...commerciale.feePartner1, percentuale: parseFloat(e.target.value) || 0 } })} style={inputStyle} /></div><div style={{ marginTop: '12px', padding: '12px', background: '#dbeafe', borderRadius: '10px', textAlign: 'center' }}><span style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb' }}>{formatCurrency(feePartner1Calc)}</span></div></div>
                <div style={{ padding: '20px', background: '#f5f3ff', borderRadius: '16px', border: '1px solid #c4b5fd' }}><h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#7c3aed' }}>Fee Partner 2</h3><div><label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#64748b' }}>% sul ricavo</label><input type="number" step="0.01" value={commerciale.feePartner2.percentuale || ''} onChange={(e) => setCommerciale({ ...commerciale, feePartner2: { ...commerciale.feePartner2, percentuale: parseFloat(e.target.value) || 0 } })} style={inputStyle} /></div><div style={{ marginTop: '12px', padding: '12px', background: '#ede9fe', borderRadius: '10px', textAlign: 'center' }}><span style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed' }}>{formatCurrency(feePartner2Calc)}</span></div></div>
              </div>
            </section>
          </div>
        )}

        {tabAttiva === 'costi' && (
          <div>
            {/* Riepilogo Sticky con Sticker */}
            <div style={{
              position: 'sticky',
              top: '100px',
              zIndex: 50,
              marginBottom: '24px',
              background: 'white',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>📊 Riepilogo Costi</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ padding: '20px', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '12px', color: '#047857', fontWeight: '500' }}>A. Gestione</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>{formatCurrency(totaleGestione)}</div>
                </div>
                <div style={{ padding: '20px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: '16px', border: '1px solid #93c5fd' }}>
                  <div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: '500' }}>B. Realizzazione</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>{formatCurrency(totaleRealizzazione)}</div>
                </div>
                <div style={{ padding: '20px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: '16px', border: '1px solid #c4b5fd' }}>
                  <div style={{ fontSize: '12px', color: '#6d28d9', fontWeight: '500' }}>C. Docenze</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>{formatCurrency(totaleDocenze)}</div>
                </div>
                <div style={{ padding: '20px', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '16px', border: '1px solid #fcd34d' }}>
                  <div style={{ fontSize: '12px', color: '#b45309', fontWeight: '500' }}>D. Fee Commerciali</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706' }}>{formatCurrency(totaleCommerciale)}</div>
                </div>
              </div>
              <div style={{ padding: '24px', background: 'linear-gradient(135deg, #fef2f2, #fecaca)', borderRadius: '16px', textAlign: 'center', border: '1px solid #fca5a5' }}>
                <div style={{ fontSize: '14px', color: '#b91c1c', fontWeight: '500' }}>COSTO TOTALE PROGETTO</div>
                <div style={{ fontSize: '36px', fontWeight: '800', color: '#dc2626' }}>{formatCurrency(costoTotaleProgetto)}</div>
              </div>
            </div>

            <section style={{ background: 'white', borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Funzionamento e Gestione</h2><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '14px', color: '#64748b' }}>Totale: <strong style={{ color: '#059669' }}>{formatCurrency(totaleGestione)}</strong></span><button onClick={aggiungiRigaGestione} style={btnStyle}>+ Aggiungi</button></div></div>
              {gestioneCosti.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nessuna voce. Clicca "Aggiungi".</div> : (
                <div style={{ display: 'grid', gap: '12px' }}>{gestioneCosti.map((item) => (
                  <div key={item.id} style={{ padding: '20px', background: '#fafafa', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
                      <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Voce di Costo</label><input type="text" value={item.voce} onChange={(e) => aggiornaGestione(item.id, 'voce', e.target.value)} style={inputStyle} /></div>
                      <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Costo Unitario €</label><input type="number" step="0.01" value={item.costoUnitario || ''} onChange={(e) => aggiornaGestione(item.id, 'costoUnitario', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                      <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Quantità</label><input type="number" value={item.quantita || ''} onChange={(e) => aggiornaGestione(item.id, 'quantita', parseInt(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                      <div style={{ textAlign: 'center' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Subtotale</label><div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '10px', fontWeight: '700', color: '#059669', border: '1px solid #a7f3d0' }}>{formatCurrency(item.costoUnitario * item.quantita)}</div></div>
                      <button onClick={() => rimuoviRigaGestione(item.id)} style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', cursor: 'pointer' }}>🗑️</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Assegna a:</span>
                      {aule.filter(a => a.attiva).map(aula => <CheckboxAula key={aula.id} aula={aula} checked={item.auleAssegnate.includes(aula.id)} onChange={() => toggleAulaAssegnata(item.id, aula.id, 'gestione')} />)}
                    </div>
                  </div>
                ))}</div>
              )}
            </section>
            <section style={{ background: 'white', borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Realizzazione</h2><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '14px', color: '#64748b' }}>Totale: <strong style={{ color: '#2563eb' }}>{formatCurrency(totaleRealizzazione)}</strong></span><button onClick={aggiungiRigaRealizzazione} style={btnStyle}>+ Aggiungi</button></div></div>
              {realizzazioneCosti.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nessuna voce.</div> : (
                <div style={{ display: 'grid', gap: '12px' }}>{realizzazioneCosti.map((item) => (
                  <div key={item.id} style={{ padding: '20px', background: '#fafafa', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto auto auto', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
                      <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Voce</label><input type="text" value={item.voce} onChange={(e) => aggiornaRealizzazione(item.id, 'voce', e.target.value)} style={inputStyle} /></div>
                      <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Tariffa €/h</label><input type="number" step="0.01" value={item.tariffaOraria || ''} onChange={(e) => aggiornaRealizzazione(item.id, 'tariffaOraria', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                      <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Ore</label><input type="number" value={item.ore || ''} onChange={(e) => aggiornaRealizzazione(item.id, 'ore', parseInt(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                      <div style={{ textAlign: 'center' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Subtotale</label><div style={{ padding: '12px', background: '#eff6ff', borderRadius: '10px', fontWeight: '700', color: '#2563eb', border: '1px solid #93c5fd' }}>{formatCurrency(item.tariffaOraria * item.ore)}</div></div>
                      <div style={{ textAlign: 'center' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>P1</label><input type="checkbox" checked={item.partner1} onChange={(e) => aggiornaRealizzazione(item.id, 'partner1', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#2563eb' }} /></div>
                      <div style={{ textAlign: 'center' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Az</label><input type="checkbox" checked={item.azienda} onChange={(e) => aggiornaRealizzazione(item.id, 'azienda', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#d97706' }} /></div>
                      <button onClick={() => rimuoviRigaRealizzazione(item.id)} style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', cursor: 'pointer' }}>🗑️</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Assegna a:</span>
                      {aule.filter(a => a.attiva).map(aula => <CheckboxAula key={aula.id} aula={aula} checked={item.auleAssegnate.includes(aula.id)} onChange={() => toggleAulaAssegnata(item.id, aula.id, 'realizzazione')} />)}
                    </div>
                  </div>
                ))}</div>
              )}
            </section>
            <section style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Docenze</h2><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '14px', color: '#64748b' }}>Totale: <strong style={{ color: '#7c3aed' }}>{formatCurrency(totaleDocenze)}</strong></span><button onClick={aggiungiRigaDocenze} style={btnStyle}>+ Aggiungi</button></div></div>
              {docenzeCosti.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nessuna docenza.</div> : (
                <div style={{ display: 'grid', gap: '12px' }}>{docenzeCosti.map((item) => (
                  <div key={item.id} style={{ padding: '20px', background: '#fafafa', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto auto auto auto', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
                      <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Docente</label><input type="text" value={item.docente} onChange={(e) => aggiornaDocenze(item.id, 'docente', e.target.value)} style={inputStyle} /></div>
                      <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Tariffa €/h</label><input type="number" step="0.01" value={item.tariffaOraria || ''} onChange={(e) => aggiornaDocenze(item.id, 'tariffaOraria', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                      <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Ore</label><input type="number" value={item.ore || ''} onChange={(e) => aggiornaDocenze(item.id, 'ore', parseInt(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div>
                      <div style={{ textAlign: 'center' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Subtotale</label><div style={{ padding: '12px', background: '#f5f3ff', borderRadius: '10px', fontWeight: '700', color: '#7c3aed', border: '1px solid #c4b5fd' }}>{formatCurrency(item.tariffaOraria * item.ore)}</div></div>
                      <div style={{ textAlign: 'center' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>P1</label><input type="checkbox" checked={item.partner1} onChange={(e) => aggiornaDocenze(item.id, 'partner1', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#2563eb' }} /></div>
                      <div style={{ textAlign: 'center' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>P2</label><input type="checkbox" checked={item.partner2} onChange={(e) => aggiornaDocenze(item.id, 'partner2', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#7c3aed' }} /></div>
                      <div style={{ textAlign: 'center' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Az</label><input type="checkbox" checked={item.azienda} onChange={(e) => aggiornaDocenze(item.id, 'azienda', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#d97706' }} /></div>
                      <button onClick={() => rimuoviRigaDocenze(item.id)} style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', cursor: 'pointer' }}>🗑️</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Assegna a:</span>
                      {aule.filter(a => a.attiva).map(aula => <CheckboxAula key={aula.id} aula={aula} checked={item.auleAssegnate.includes(aula.id)} onChange={() => toggleAulaAssegnata(item.id, aula.id, 'docenze')} />)}
                    </div>
                  </div>
                ))}</div>
              )}
            </section>
          </div>
        )}

        {tabAttiva === 'confronto' && (
          <section style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Confronto tra Aule</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead><tr><th style={{ padding: '16px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>Metrica</th>{aule.filter(a => a.attiva).map(aula => <th key={aula.id} style={{ padding: '16px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}><BadgeAula aula={aula} /></th>)}<th style={{ padding: '16px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', color: '#1e293b', fontSize: '13px', fontWeight: '700', background: '#f8fafc' }}>TOTALE</th></tr></thead>
                <tbody>
                  {[
                    { label: 'Allievi', getValue: (a) => a.numeroAllievi, format: (v) => v, total: aule.filter(a => a.attiva).reduce((acc, a) => acc + a.numeroAllievi, 0) },
                    { label: 'Ore', getValue: (a) => a.oreTotaliCorso, format: (v) => v, total: aule.filter(a => a.attiva).reduce((acc, a) => acc + a.oreTotaliCorso, 0) },
                    { label: 'UCS', getValue: (a) => a.ucsApplicata, format: formatCurrency, total: '-' },
                    { label: 'Ricavo', getValue: (a) => calcolaRicavoAula(a), format: formatCurrency, total: ricavoTotale, color: '#059669' },
                    { label: 'Costi Gestione', getValue: (a) => calcolaCostiAula(a.id).gestione, format: formatCurrency, total: totaleGestione },
                    { label: 'Costi Realizzazione', getValue: (a) => calcolaCostiAula(a.id).realizzazione, format: formatCurrency, total: totaleRealizzazione },
                    { label: 'Costi Docenze', getValue: (a) => calcolaCostiAula(a.id).docenze, format: formatCurrency, total: totaleDocenze },
                    { label: 'Fee Partner 1 (' + commerciale.feePartner1.percentuale + '%)', getValue: (a) => calcolaCostiAula(a.id).feePartner1, format: formatCurrency, total: feePartner1Calc, color: '#2563eb' },
                    { label: 'Fee Partner 2 (' + commerciale.feePartner2.percentuale + '%)', getValue: (a) => calcolaCostiAula(a.id).feePartner2, format: formatCurrency, total: feePartner2Calc, color: '#7c3aed' },
                    { label: 'Costo Partner 1', getValue: (a) => calcolaCostiAula(a.id).costoPartner1, format: formatCurrency, total: costoPartner1, color: '#2563eb' },
                    { label: 'Costo Partner 2', getValue: (a) => calcolaCostiAula(a.id).costoPartner2, format: formatCurrency, total: costoPartner2, color: '#7c3aed' },
                    { label: 'Guadagno Azienda', getValue: (a) => calcolaCostiAula(a.id).guadagnoAzienda, format: formatCurrency, total: guadagnoAzienda, color: '#d97706' },
                    { label: 'Altri Costi', getValue: (a) => calcolaCostiAula(a.id).altriCosti, format: formatCurrency, total: altriCosti },
                    { label: 'Costo Totale', getValue: (a) => calcolaCostiAula(a.id).totale, format: formatCurrency, total: costoTotaleProgetto, color: '#dc2626' },
                    { label: 'Margine', getValue: (a) => calcolaRicavoAula(a) - calcolaCostiAula(a.id).totale, format: formatCurrency, total: margine, color: margine >= 0 ? '#059669' : '#dc2626' },
                  ].map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}><td style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', color: row.color || '#1e293b', fontWeight: row.color ? '600' : '400' }}>{row.label}</td>{aule.filter(a => a.attiva).map(aula => <td key={aula.id} style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: row.color || '#1e293b' }}>{row.format(row.getValue(aula))}</td>)}<td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontWeight: '700', color: row.color || '#1e293b', background: '#f8fafc' }}>{typeof row.total === 'number' ? row.format(row.total) : row.total}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* MODALI */}
      {mostraModalCarica && (<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}><div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}><h3 style={{ margin: 0, color: '#1e293b' }}>📂 Carica Progetto</h3><button onClick={() => setMostraModalCarica(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button></div>
        <input type="text" placeholder="Cerca..." value={ricercaPreventivo} onChange={(e) => setRicercaPreventivo(e.target.value)} style={{ ...inputStyle, marginBottom: '16px' }} />
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {preventivi.filter(p => p.nome.toLowerCase().includes(ricercaPreventivo.toLowerCase())).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nessun preventivo trovato.</div>
          ) : (
            preventivi.filter(p => p.nome.toLowerCase().includes(ricercaPreventivo.toLowerCase())).map(p => (
              <div key={p.id} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => caricaPreventivo(p.id)}>
                <div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{p.nome}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{formatDate(p.updated_at)}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); eliminaPreventivo(p.id); }} style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
              </div>
            ))
          )}
        </div>
      </div></div>)}

      {mostraModalNote && (<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}><div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}><h3 style={{ margin: 0, color: '#1e293b' }}>📝 Note</h3><button onClick={() => setMostraModalNote(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button></div>{note.length > 0 && <div style={{ marginBottom: '20px' }}>{note.map(n => <div key={n.id} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', marginBottom: '8px', border: '1px solid #e2e8f0' }}><div style={{ color: '#1e293b' }}>{n.testo}</div><div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>{n.data}</div></div>)}</div>}{note.length === 0 && <p style={{ color: '#64748b', marginBottom: '20px' }}>Nessuna nota.</p>}<textarea value={nuovaNota} onChange={(e) => setNuovaNota(e.target.value)} placeholder="Scrivi una nota..." style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} /><div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}><button onClick={() => setMostraModalNote(false)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer' }}>Annulla</button><button onClick={aggiungiNota} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>Salva</button></div></div></div>)}

      {mostraConfigAule && (<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}><div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '700px', width: '90%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}><h3 style={{ margin: 0, color: '#1e293b' }}>🏫 Gestione Aule</h3><button onClick={() => setMostraConfigAule(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button></div><p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>Ogni aula = un'edizione con proprio finanziamento. Assegna i costi a una o più aule.</p><div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>{aule.map((aula) => (<div key={aula.id} style={{ padding: '20px', background: '#fafafa', borderRadius: '14px', border: '2px solid ' + aula.colore + '30' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}><input type="color" value={aula.colore} onChange={(e) => aggiornaAula(aula.id, 'colore', e.target.value)} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }} /><input type="text" value={aula.nome} onChange={(e) => aggiornaAula(aula.id, 'nome', e.target.value)} style={{ ...inputStyle, flex: 1, color: aula.colore, fontWeight: '600' }} /><label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={aula.attiva} onChange={(e) => aggiornaAula(aula.id, 'attiva', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: aula.colore }} /><span style={{ fontSize: '13px', color: '#64748b' }}>Attiva</span></label>{aule.length > 1 && <button onClick={() => rimuoviAula(aula.id)} style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>}</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}><div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Allievi</label><input type="number" value={aula.numeroAllievi || ''} onChange={(e) => aggiornaAula(aula.id, 'numeroAllievi', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div><div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Ore</label><input type="number" value={aula.oreTotaliCorso || ''} onChange={(e) => aggiornaAula(aula.id, 'oreTotaliCorso', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div><div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>UCS €</label><input type="number" step="0.01" value={aula.ucsApplicata || ''} onChange={(e) => aggiornaAula(aula.id, 'ucsApplicata', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'center' }} /></div></div><div style={{ marginTop: '12px', padding: '10px', background: aula.colore + '15', borderRadius: '8px', textAlign: 'center', border: '1px solid ' + aula.colore + '30' }}><span style={{ fontSize: '12px', color: '#64748b' }}>Ricavo: </span><span style={{ fontSize: '18px', fontWeight: '700', color: aula.colore }}>{formatCurrency(calcolaRicavoAula(aula))}</span></div></div>))}</div><button onClick={aggiungiAula} style={{ width: '100%', padding: '16px', ...btnStyle, fontSize: '15px' }}>+ Aggiungi Nuova Aula</button></div></div>)}

      {mostraAdmin && (<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}><div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}><h3 style={{ margin: 0, color: '#1e293b' }}>⚙️ Admin</h3><button onClick={() => setMostraAdmin(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button></div><div><h4 style={{ margin: '0 0 12px', color: '#64748b', fontSize: '14px' }}>Progetti Salvati ({preventivi.length})</h4>{preventivi.length === 0 ? <p style={{ color: '#94a3b8' }}>Nessuno.</p> : preventivi.map(p => (<div key={p.id} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}><div><div style={{ fontWeight: '600', color: '#1e293b' }}>{p.nome}</div><div style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(p.updated_at)}</div></div><button onClick={() => eliminaPreventivo(p.id)} style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer' }}>Elimina</button></div>))}</div></div></div>)}

      {/* MODALE SELEZIONE SEZIONI PDF */}
      {mostraModalPDF && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '640px', width: '92%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>📄 Seleziona sezioni da stampare</h3>
              <button onClick={() => setMostraModalPDF(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>Clicca i badge per includere o escludere ogni sezione dal PDF.</p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <button onClick={() => selezionaTutteSezioniPDF(true)} style={{ padding: '8px 14px', background: '#eff6ff', color: '#2563eb', border: '1px solid #93c5fd', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>✓ Seleziona tutto</button>
              <button onClick={() => selezionaTutteSezioniPDF(false)} style={{ padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>✕ Deseleziona tutto</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
              {[
                { chiave: 'intestazione', label: '📋 Intestazione progetto', colore: '#2563eb' },
                { chiave: 'riepilogoGlobale', label: '💰 Riepilogo finanziario globale', colore: '#059669' },
                { chiave: 'incidenze', label: '📊 Indicatori di incidenza', colore: '#7c3aed' },
                { chiave: 'margine', label: '🎯 Margine totale', colore: margine >= 0 ? '#059669' : '#dc2626' },
                { chiave: 'configAule', label: '🏫 Configurazione aule', colore: '#059669' },
                { chiave: 'feeCommerciali', label: '💼 Fee commerciali', colore: '#d97706' },
                { chiave: 'dettaglioGestione', label: '🔧 Dettaglio gestione', colore: '#059669' },
                { chiave: 'dettaglioRealizzazione', label: '🛠️ Dettaglio realizzazione', colore: '#2563eb' },
                { chiave: 'dettaglioDocenze', label: '👨‍🏫 Dettaglio docenze', colore: '#7c3aed' },
                { chiave: 'confrontoAule', label: '⚖️ Riepilogo per aula', colore: '#059669' },
                { chiave: 'note', label: '📝 Note', colore: '#64748b' },
              ].map(sezione => {
                const attiva = sezioniPDF[sezione.chiave];
                return (
                  <button
                    key={sezione.chiave}
                    onClick={() => toggleSezionePDF(sezione.chiave)}
                    style={{
                      padding: '10px 16px',
                      background: attiva ? sezione.colore : '#f1f5f9',
                      color: attiva ? 'white' : '#64748b',
                      border: '2px solid ' + (attiva ? sezione.colore : '#e2e8f0'),
                      borderRadius: '24px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s',
                      opacity: attiva ? 1 : 0.7,
                    }}
                  >
                    <span style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: attiva ? 'rgba(255,255,255,0.25)' : 'white',
                      border: '1.5px solid ' + (attiva ? 'white' : '#cbd5e1'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: attiva ? 'white' : 'transparent', fontSize: '11px', fontWeight: '800'
                    }}>{attiva ? '✓' : ''}</span>
                    {sezione.label}
                  </button>
                );
              })}
            </div>

            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '12px', color: '#64748b', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              Sezioni incluse: <strong style={{ color: '#2563eb' }}>{Object.values(sezioniPDF).filter(Boolean).length}</strong> su {Object.keys(sezioniPDF).length}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setMostraModalPDF(false)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: '500' }}>Annulla</button>
              <button onClick={eseguiStampaPDF} disabled={Object.values(sezioniPDF).every(v => !v)} style={{ flex: 2, padding: '14px', background: Object.values(sezioniPDF).every(v => !v) ? '#cbd5e1' : 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', border: 'none', borderRadius: '12px', cursor: Object.values(sezioniPDF).every(v => !v) ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' }}>📄 Stampa / Salva PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* ============ AREA STAMPABILE (PDF) — visibile solo durante window.print() ============ */}
    <div className="print-area" style={{ padding: '0', background: 'white', color: '#1e293b', fontFamily: 'Inter, Arial, sans-serif', fontSize: '11px', lineHeight: '1.4' }}>

      {/* PAGINA 1 — Intestazione + Riepilogo Finanziario Globale */}
      <div className="pdf-page">
        {sezioniPDF.intestazione && (
        <div className="pdf-avoid-break" style={{ borderBottom: '3px solid #2563eb', paddingBottom: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', color: '#1e293b' }}>Preventivo Formativo</h1>
              <h2 style={{ margin: '4px 0 0', fontSize: '16px', color: '#2563eb', fontWeight: '600' }}>{progetto.nome || '(Senza nome)'}</h2>
              {progetto.descrizione && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>{progetto.descrizione}</p>}
            </div>
            <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b' }}>
              <div>Data stampa: {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
              <div>Creato: {formatDate(progetto.dataCreazione)}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px' }}>
            <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '600' }}>🏫 Aule attive</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#2563eb' }}>{aule.filter(a => a.attiva).length}</span>
            </div>
            <div style={{ padding: '10px 14px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#6d28d9', fontWeight: '600' }}>👥 Allievi totali</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed' }}>{aule.filter(a => a.attiva).reduce((acc, a) => acc + (a.numeroAllievi || 0), 0)}</span>
            </div>
            <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#047857', fontWeight: '600' }}>⏱️ Ore totali</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>{aule.filter(a => a.attiva).reduce((acc, a) => acc + (a.oreTotaliCorso || 0), 0)}</span>
            </div>
          </div>
        </div>
        )}

        {/* Riepilogo Finanziario Globale */}
        {sezioniPDF.riepilogoGlobale && (
        <div className="pdf-avoid-break" style={{ marginBottom: '18px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#1e293b', borderLeft: '4px solid #2563eb', paddingLeft: '8px' }}>Riepilogo Finanziario Globale</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr style={{ background: '#ecfdf5' }}>
                <td style={{ padding: '8px', border: '1px solid #d1fae5', fontWeight: '600', color: '#047857' }}>A. Ricavo Totale</td>
                <td style={{ padding: '8px', border: '1px solid #d1fae5', textAlign: 'right', fontWeight: '700', color: '#059669', fontSize: '13px' }}>{formatCurrency(ricavoTotale)}</td>
              </tr>
              <tr style={{ background: '#fef2f2' }}>
                <td style={{ padding: '8px', border: '1px solid #fecaca', fontWeight: '600', color: '#b91c1c' }}>B. Costo Totale Progetto</td>
                <td style={{ padding: '8px', border: '1px solid #fecaca', textAlign: 'right', fontWeight: '700', color: '#dc2626', fontSize: '13px' }}>{formatCurrency(costoTotaleProgetto)}</td>
              </tr>
              <tr style={{ background: '#eff6ff' }}>
                <td style={{ padding: '8px', border: '1px solid #93c5fd', fontWeight: '600', color: '#1d4ed8' }}>C. Costo Partner 1</td>
                <td style={{ padding: '8px', border: '1px solid #93c5fd', textAlign: 'right', fontWeight: '700', color: '#2563eb' }}>{formatCurrency(costoPartner1)}</td>
              </tr>
              <tr style={{ background: '#f5f3ff' }}>
                <td style={{ padding: '8px', border: '1px solid #c4b5fd', fontWeight: '600', color: '#6d28d9' }}>D. Costo Partner 2</td>
                <td style={{ padding: '8px', border: '1px solid #c4b5fd', textAlign: 'right', fontWeight: '700', color: '#7c3aed' }}>{formatCurrency(costoPartner2)}</td>
              </tr>
              <tr style={{ background: '#fffbeb' }}>
                <td style={{ padding: '8px', border: '1px solid #fcd34d', fontWeight: '600', color: '#b45309' }}>E. Guadagno Azienda</td>
                <td style={{ padding: '8px', border: '1px solid #fcd34d', textAlign: 'right', fontWeight: '700', color: '#d97706' }}>{formatCurrency(guadagnoAzienda)}</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: '600', color: '#475569' }}>F. Altri Costi</td>
                <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', color: '#475569' }}>{formatCurrency(altriCosti)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        )}

        {/* Indicatori di incidenza */}
        {sezioniPDF.incidenze && (
        <div className="pdf-avoid-break" style={{ marginBottom: '18px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#1e293b', borderLeft: '4px solid #7c3aed', paddingLeft: '8px' }}>Indicatori di Incidenza sul Ricavo</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Voce</th>
                <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Incidenza %</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: '6px', border: '1px solid #e2e8f0', color: '#2563eb' }}>Inc. Partner 1</td><td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600' }}>{formatPercentage(incidenzaPartner1)}</td></tr>
              <tr><td style={{ padding: '6px', border: '1px solid #e2e8f0', color: '#7c3aed' }}>Inc. Partner 2</td><td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600' }}>{formatPercentage(incidenzaPartner2)}</td></tr>
              <tr><td style={{ padding: '6px', border: '1px solid #e2e8f0', color: '#475569' }}>Inc. Altri Costi</td><td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600' }}>{formatPercentage(incidenzaAltriCosti)}</td></tr>
              <tr><td style={{ padding: '6px', border: '1px solid #e2e8f0', color: '#d97706' }}>Inc. Azienda (Margine)</td><td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600' }}>{formatPercentage(incidenzaAzienda)}</td></tr>
            </tbody>
          </table>
        </div>
        )}

        {/* Margine Totale */}
        {sezioniPDF.margine && (
        <div className="pdf-avoid-break" style={{ marginBottom: '18px', padding: '14px', background: margine >= 0 ? '#ecfdf5' : '#fef2f2', border: '2px solid ' + (margine >= 0 ? '#059669' : '#dc2626'), borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: margine >= 0 ? '#047857' : '#b91c1c', fontWeight: '600', marginBottom: '4px' }}>MARGINE TOTALE</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: margine >= 0 ? '#059669' : '#dc2626', marginBottom: '6px' }}>{formatCurrency(margine)}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>
            = Ricavo Totale ({formatCurrency(ricavoTotale)}) − Costo Totale ({formatCurrency(costoTotaleProgetto)}) + Guadagno Azienda ({formatCurrency(guadagnoAzienda)})
          </div>
        </div>
        )}

        {/* Configurazione Aule */}
        {sezioniPDF.configAule && (
        <div className="pdf-avoid-break">
          <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#1e293b', borderLeft: '4px solid #059669', paddingLeft: '8px' }}>Configurazione Aule</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Aula</th>
                <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Stato</th>
                <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Allievi</th>
                <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Ore</th>
                <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>UCS</th>
                <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Ricavo</th>
              </tr>
            </thead>
            <tbody>
              {aule.map(aula => (
                <tr key={aula.id}>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0', color: aula.colore, fontWeight: '600' }}>{aula.nome}</td>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{aula.attiva ? 'Attiva' : 'Disattiva'}</td>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{aula.numeroAllievi}</td>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{aula.oreTotaliCorso}</td>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(aula.ucsApplicata)}</td>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600', color: '#059669' }}>{formatCurrency(calcolaRicavoAula(aula))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: '700' }}>
                <td colSpan={5} style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>TOTALE RICAVO</td>
                <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#059669' }}>{formatCurrency(ricavoTotale)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        )}
      </div>

      {/* PAGINA 2 — Dettaglio Costi */}
      <div className="pdf-page">
        <h2 style={{ margin: '0 0 14px', fontSize: '16px', color: '#1e293b', borderBottom: '2px solid #dc2626', paddingBottom: '6px' }}>Dettaglio Costi</h2>

        {/* Fee Commerciali */}
        {sezioniPDF.feeCommerciali && (
        <div className="pdf-avoid-break" style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: '#d97706', borderLeft: '4px solid #d97706', paddingLeft: '8px' }}>Fee Commerciali</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead><tr style={{ background: '#f1f5f9' }}><th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Fee</th><th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>%</th><th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Importo</th></tr></thead>
            <tbody>
              <tr><td style={{ padding: '6px', border: '1px solid #e2e8f0', color: '#2563eb', fontWeight: '600' }}>Fee Partner 1</td><td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{commerciale.feePartner1.percentuale}%</td><td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600', color: '#2563eb' }}>{formatCurrency(feePartner1Calc)}</td></tr>
              <tr><td style={{ padding: '6px', border: '1px solid #e2e8f0', color: '#7c3aed', fontWeight: '600' }}>Fee Partner 2</td><td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{commerciale.feePartner2.percentuale}%</td><td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600', color: '#7c3aed' }}>{formatCurrency(feePartner2Calc)}</td></tr>
              <tr style={{ background: '#f8fafc', fontWeight: '700' }}><td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Totale Fee Commerciali</td><td style={{ padding: '6px', border: '1px solid #cbd5e1' }}></td><td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#d97706' }}>{formatCurrency(totaleCommerciale)}</td></tr>
            </tbody>
          </table>
        </div>
        )}

        {/* Gestione */}
        {sezioniPDF.dettaglioGestione && (
        <div className="pdf-avoid-break" style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: '#059669', borderLeft: '4px solid #059669', paddingLeft: '8px' }}>A. Funzionamento e Gestione — Totale: {formatCurrency(totaleGestione)}</h3>
          {gestioneCosti.length === 0 ? <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0' }}>Nessuna voce.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead><tr style={{ background: '#f1f5f9' }}><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Voce</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'right' }}>€/unità</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Q.tà</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Aule</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Subtotale</th></tr></thead>
              <tbody>
                {gestioneCosti.map(item => {
                  const nomiAule = aule.filter(a => item.auleAssegnate.includes(a.id)).map(a => a.nome).join(', ') || '-';
                  return (
                    <tr key={item.id}>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0' }}>{item.voce}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(item.costoUnitario)}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{item.quantita}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px' }}>{nomiAule}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600', color: '#059669' }}>{formatCurrency(item.costoUnitario * item.quantita * item.auleAssegnate.length)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        )}

        {/* Realizzazione */}
        {sezioniPDF.dettaglioRealizzazione && (
        <div className="pdf-avoid-break" style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: '#2563eb', borderLeft: '4px solid #2563eb', paddingLeft: '8px' }}>B. Realizzazione — Totale: {formatCurrency(totaleRealizzazione)}</h3>
          {realizzazioneCosti.length === 0 ? <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0' }}>Nessuna voce.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead><tr style={{ background: '#f1f5f9' }}><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Voce</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Tariffa €/h</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Ore</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'center' }}>P1</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Az</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Aule</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Subtotale</th></tr></thead>
              <tbody>
                {realizzazioneCosti.map(item => {
                  const nomiAule = aule.filter(a => item.auleAssegnate.includes(a.id)).map(a => a.nome).join(', ') || '-';
                  return (
                    <tr key={item.id}>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0' }}>{item.voce}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(item.tariffaOraria)}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{item.ore}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{item.partner1 ? '✓' : ''}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{item.azienda ? '✓' : ''}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px' }}>{nomiAule}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600', color: '#2563eb' }}>{formatCurrency(item.tariffaOraria * item.ore * item.auleAssegnate.length)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        )}

        {/* Docenze */}
        {sezioniPDF.dettaglioDocenze && (
        <div className="pdf-avoid-break">
          <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: '#7c3aed', borderLeft: '4px solid #7c3aed', paddingLeft: '8px' }}>C. Docenze — Totale: {formatCurrency(totaleDocenze)}</h3>
          {docenzeCosti.length === 0 ? <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0' }}>Nessuna voce.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead><tr style={{ background: '#f1f5f9' }}><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Docente</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Tariffa €/h</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Ore</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'center' }}>P1</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'center' }}>P2</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Az</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Aule</th><th style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Subtotale</th></tr></thead>
              <tbody>
                {docenzeCosti.map(item => {
                  const nomiAule = aule.filter(a => item.auleAssegnate.includes(a.id)).map(a => a.nome).join(', ') || '-';
                  return (
                    <tr key={item.id}>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0' }}>{item.docente}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(item.tariffaOraria)}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{item.ore}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{item.partner1 ? '✓' : ''}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{item.partner2 ? '✓' : ''}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{item.azienda ? '✓' : ''}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px' }}>{nomiAule}</td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600', color: '#7c3aed' }}>{formatCurrency(item.tariffaOraria * item.ore * item.auleAssegnate.length)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        )}
      </div>

      {/* PAGINA 3 — Riepilogo per Aula + Note */}
      <div className="pdf-page">
        {sezioniPDF.confrontoAule && (<>
        <h2 style={{ margin: '0 0 14px', fontSize: '16px', color: '#1e293b', borderBottom: '2px solid #059669', paddingBottom: '6px' }}>Riepilogo per Aula</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '18px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Metrica</th>
              {aule.filter(a => a.attiva).map(aula => <th key={aula.id} style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', color: aula.colore }}>{aula.nome}</th>)}
              <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', background: '#f8fafc', fontWeight: '700' }}>TOTALE</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Allievi', getValue: (a) => a.numeroAllievi, format: (v) => v, total: aule.filter(a => a.attiva).reduce((acc, a) => acc + a.numeroAllievi, 0) },
              { label: 'Ore', getValue: (a) => a.oreTotaliCorso, format: (v) => v, total: aule.filter(a => a.attiva).reduce((acc, a) => acc + a.oreTotaliCorso, 0) },
              { label: 'UCS', getValue: (a) => a.ucsApplicata, format: formatCurrency, total: '-' },
              { label: 'Ricavo', getValue: (a) => calcolaRicavoAula(a), format: formatCurrency, total: ricavoTotale, color: '#059669' },
              { label: 'Costi Gestione', getValue: (a) => calcolaCostiAula(a.id).gestione, format: formatCurrency, total: totaleGestione },
              { label: 'Costi Realizzazione', getValue: (a) => calcolaCostiAula(a.id).realizzazione, format: formatCurrency, total: totaleRealizzazione },
              { label: 'Costi Docenze', getValue: (a) => calcolaCostiAula(a.id).docenze, format: formatCurrency, total: totaleDocenze },
              { label: 'Fee Partner 1', getValue: (a) => calcolaCostiAula(a.id).feePartner1, format: formatCurrency, total: feePartner1Calc, color: '#2563eb' },
              { label: 'Fee Partner 2', getValue: (a) => calcolaCostiAula(a.id).feePartner2, format: formatCurrency, total: feePartner2Calc, color: '#7c3aed' },
              { label: 'Costo Partner 1', getValue: (a) => calcolaCostiAula(a.id).costoPartner1, format: formatCurrency, total: costoPartner1, color: '#2563eb' },
              { label: 'Costo Partner 2', getValue: (a) => calcolaCostiAula(a.id).costoPartner2, format: formatCurrency, total: costoPartner2, color: '#7c3aed' },
              { label: 'Guadagno Azienda', getValue: (a) => calcolaCostiAula(a.id).guadagnoAzienda, format: formatCurrency, total: guadagnoAzienda, color: '#d97706' },
              { label: 'Altri Costi', getValue: (a) => calcolaCostiAula(a.id).altriCosti, format: formatCurrency, total: altriCosti },
              { label: 'Costo Totale', getValue: (a) => calcolaCostiAula(a.id).totale, format: formatCurrency, total: costoTotaleProgetto, color: '#dc2626' },
              { label: 'Margine', getValue: (a) => calcolaRicavoAula(a) - calcolaCostiAula(a.id).totale, format: formatCurrency, total: margine, color: margine >= 0 ? '#059669' : '#dc2626' },
            ].map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                <td style={{ padding: '5px 6px', border: '1px solid #e2e8f0', fontWeight: row.color ? '600' : '400', color: row.color || '#1e293b' }}>{row.label}</td>
                {aule.filter(a => a.attiva).map(aula => <td key={aula.id} style={{ padding: '5px 6px', border: '1px solid #e2e8f0', textAlign: 'right', color: row.color || '#1e293b' }}>{row.format(row.getValue(aula))}</td>)}
                <td style={{ padding: '5px 6px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', background: '#f8fafc', color: row.color || '#1e293b' }}>{typeof row.total === 'number' ? row.format(row.total) : row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </>)}

        {/* Note */}
        {sezioniPDF.note && note.length > 0 && (
          <div className="pdf-avoid-break">
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#1e293b', borderLeft: '4px solid #64748b', paddingLeft: '8px' }}>Note</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {note.map(n => (
                <div key={n.id} style={{ padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <div style={{ color: '#1e293b', fontSize: '11px' }}>{n.testo}</div>
                  <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>{n.data}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '28px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '9px', color: '#94a3b8', textAlign: 'center' }}>
          Budget Planner Multi-Aula • Documento generato il {new Date().toLocaleString('it-IT')}
        </div>
      </div>
    </div>
    </>
  );
};

export default BudgetPlannerMultiAula;
