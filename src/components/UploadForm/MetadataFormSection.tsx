import React from 'react';
import { Input, Select, InputLabel } from '../StyledComponents';
import { FormGrid } from './UploadForm.styles';

interface MetadataFormSectionProps {
  title: string;
  description: string;
  videoType: string;
  handleMetadataChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  t: (key: string) => string;
}

const MetadataFormSection: React.FC<MetadataFormSectionProps> = ({
  title,
  description,
  videoType,
  handleMetadataChange,
  t
}) => {
  return (
    <FormGrid>
      <div>
        <InputLabel>Video Title</InputLabel>
        <Input
          type="text"
          name="title"
          value={title}
          onChange={handleMetadataChange}
          placeholder="Enter video title"
        />
      </div>

      <div>
        <InputLabel>Description</InputLabel>
        <Input
          type="text"
          name="description"
          value={description}
          onChange={handleMetadataChange}
          placeholder="Enter video description"
        />
      </div>

      <div>
        <InputLabel>Video Type</InputLabel>
        <Select
          name="videoType"
          value={videoType}
          onChange={handleMetadataChange}
          disabled
        >
          <option value="Subtitled Video">Subtitled Video</option>
        </Select>
      </div>
    </FormGrid>
  );
};

export default MetadataFormSection;