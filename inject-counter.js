const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'apps/web/app/home-page-client.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">`;

const replacementStr = `        </div>
      </section>

      {/* Start counter section */}
      <section className="bg-[#f8f8f8] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="page-container flex flex-col items-center justify-between gap-12 lg:flex-row lg:items-start">
          
          {/* Left: Heading and description */}
          <div className="flex max-w-xl flex-col gap-6">
            <h2 className="font-poppins text-3xl font-medium tracking-tight text-[#101010] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Simplifying Business Complexity With AI
            </h2>
            <p className="text-base leading-relaxed text-[#5f6773] sm:text-lg">
              Lorem ipsum dolor sit amet consectetur. Scelerisque donec non dolor sit lorem aliquam id in quis. Tristique scelerisque id cursus phasellus.
            </p>
          </div>

          {/* Right: Badge and Counters */}
          <div className="flex w-full flex-col gap-10 lg:w-auto lg:flex-row lg:items-center lg:gap-16">
            
             {/* Badge */}
            <div className="flex justify-center lg:block shrink-0">
               <ArgroBadge />
            </div>

            {/* Counters Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-12">
              <div className="flex flex-col gap-1">
                <AnimatedCounter
                  value={5}
                  suffix="+"
                  className="font-poppins text-[2.5rem] font-medium leading-none text-[#101010]"
                />
                <span className="text-sm font-medium text-[#5f6773] uppercase tracking-wider">Countries</span>
              </div>
              <div className="flex flex-col gap-1">
                <AnimatedCounter
                  value={15}
                  suffix="+"
                  className="font-poppins text-[2.5rem] font-medium leading-none text-[#101010]"
                />
                <span className="text-sm font-medium text-[#5f6773] uppercase tracking-wider">Years Exp</span>
              </div>
              <div className="flex flex-col gap-1">
                <AnimatedCounter
                  value={72}
                  suffix="+"
                  className="font-poppins text-[2.5rem] font-medium leading-none text-[#101010]"
                />
                <span className="text-sm font-medium text-[#5f6773] uppercase tracking-wider">Active PRJ</span>
              </div>
              <div className="flex flex-col gap-1">
                <AnimatedCounter
                  value={99}
                  suffix="%"
                  className="font-poppins text-[2.5rem] font-medium leading-none text-[#101010]"
                />
                <span className="text-sm font-medium text-[#5f6773] uppercase tracking-wider">Client SAT</span>
              </div>
            </div>

          </div>
        </div>
      </section>
      {/* End counter section */}

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully inserted counter section.');
} else {
  console.log('Target string not found. Please review file format / newlines.');
}
