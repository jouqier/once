export class UploadService {
    static IMGUR_CLIENT_ID = '410e2416e40aabe';

    static async uploadImage(blob) {
        try {
            const base64 = await this._blobToBase64(blob);
            const base64Data = base64.split(',')[1];

            const response = await fetch('https://api.imgur.com/3/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Client-ID ${this.IMGUR_CLIENT_ID}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: base64Data,
                    type: 'base64',
                    name: 'story.jpg',
                    title: 'Movie Rating Story'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.data?.error || 'Upload failed');
            }

            const data = await response.json();
            return data.data.link;
        } catch (error) {
            console.error('Error uploading to Imgur:', error);
            throw error;
        }
    }

    static _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
} 