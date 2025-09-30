import React from 'react';
import { MintableDraft } from '../api/workflow';
import { Mint } from '../components/mint';

interface MintPageProps {
    draft: MintableDraft;
    onBack: () => void;
}

export const MintPage: React.FC<MintPageProps> = ({ draft, onBack }) => {
    return (
        <Mint
            draftId={draft.draft_id}
            onBack={onBack}
        />
    );
};
