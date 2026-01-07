import React from 'react';

const Loading = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#E8E4D9]">
            <div className="flex space-x-2">
                {/* Equalizer Bar 1 */}
                <div
                    className="w-3 bg-[#CD4631] rounded-full animate-[bounce_1s_infinite_100ms] h-12"
                    style={{ animationDuration: '1s' }}
                />
                {/* Equalizer Bar 2 */}
                <div
                    className="w-3 bg-[#CD4631] rounded-full animate-[bounce_1s_infinite_200ms] h-16"
                    style={{ animationDuration: '1.2s' }}
                />
                {/* Equalizer Bar 3 */}
                <div
                    className="w-3 bg-[#CD4631] rounded-full animate-[bounce_1s_infinite_300ms] h-20"
                    style={{ animationDuration: '0.8s' }}
                />
                {/* Equalizer Bar 4 */}
                <div
                    className="w-3 bg-[#CD4631] rounded-full animate-[bounce_1s_infinite_400ms] h-14"
                    style={{ animationDuration: '1.1s' }}
                />
                {/* Equalizer Bar 5 */}
                <div
                    className="w-3 bg-[#CD4631] rounded-full animate-[bounce_1s_infinite_500ms] h-10"
                    style={{ animationDuration: '0.9s' }}
                />
            </div>
        </div>
    );
};

export default Loading;
