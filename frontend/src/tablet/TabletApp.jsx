import React, { useState, useEffect } from 'react';
import { api } from '../api';
import OperatorSelect from './OperatorSelect';
import CategorySelect from './CategorySelect';
import ProductSelect from './ProductSelect';
import BatchNumbers from './BatchNumbers';
import Measurements from './Measurements';
import SessionReview from './SessionReview';

export default function TabletApp() {
  const [step, setStep] = useState(1);
  const [sessionData, setSessionData] = useState({
    operator: null,
    category: null,
    product: null,
    batchNumbers: {},
    sessionId: null
  });

  const nextStep = () => setStep(s => s + 1);
  const resetSession = () => {
    setSessionData({ operator: null, category: null, product: null, batchNumbers: {}, sessionId: null });
    setStep(1);
  };

  const updateData = (data) => setSessionData(prev => ({ ...prev, ...data }));

  return (
    <div className="tablet-container">
      {step === 1 && <OperatorSelect onSelect={(op) => { updateData({ operator: op }); nextStep(); }} />}
      {step === 2 && <CategorySelect onSelect={(cat) => { updateData({ category: cat }); nextStep(); }} onBack={() => setStep(1)} />}
      {step === 3 && <ProductSelect categoryId={sessionData.category?.id} onSelect={(prod) => { updateData({ product: prod }); nextStep(); }} onBack={() => setStep(2)} />}
      {step === 4 && <BatchNumbers product={sessionData.product} onSubmit={(batches) => { updateData({ batchNumbers: batches }); nextStep(); }} onBack={() => setStep(3)} />}
      {step === 5 && (
        <Measurements 
          sessionData={sessionData} 
          onSessionCreated={(id) => updateData({ sessionId: id })}
          onCancel={resetSession}
          onFinish={nextStep} 
        />
      )}
      {step === 6 && <SessionReview sessionId={sessionData.sessionId} onComplete={resetSession} />}
    </div>
  );
}
